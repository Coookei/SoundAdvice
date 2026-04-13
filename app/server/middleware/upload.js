// handling file uploads manually
import express from 'express'; 
import fs from 'fs';
import path from 'path'; 
import pool from '../db.js'; 

const router = express.Router();

// set max file size to 5MB 
const max_file_size = 5 * 1024 * 1024; 

// split buffer by delimiter
// deliimiter - used to split raw multipart request into separate sections 
function splitBuffer(buffer, delimiter) {

    // array to store split sections 
    const parts = [];

    // starting position for searching the buffer 
    let start = 0;

    while (true) {
        // find next occurence of delimiter from current position 
        const index = buffer.indexOf(delimiter, start);

        if (index == -1) {
            // push remaining buffer if no delimiters found 
            parts.push(buffer.slice(start));
            break;
        }

        // extract chunk between current start + delimiter position 
        parts.push(buffer.slice(start, index));

        // move start position part delimiter for next iteration 
        start = index + delimiter.length;
    }

    // return array of split buffer sections 
    return parts; 
}

// upload profile picture route 
router.post('/upload-pfp', (req, res) => {
    // authentication check - checks user logged in before allowing upload 
    if (!req.session || !req.session.userId) {
        return res.status(400).send('Unauthorised');
    }

    // checks content type of request using headers 
    const contentType = req.headers['content-type'];

    // content type needs to be multipart form data 
    if (!contentType || !contentType.includes('multipart/form-data')) {
        return res.status(400).send('Invalid request'); 
    }

    // extract boundary - used to separate different sections in the request body 
    const boundaryMatch = contentType.match(/boundary=(.+)$/); 

    // boundary not found 
    if (!boundaryMatch) {
        return res.status(400).send('Missing boundary'); 
    }

    // extracts boundary string from content type header 
    const boundary = boundaryMatch[1];

    // creates delimiter to split form sections 
    const delimiter = Buffer.from(`--${boundary}`); 

    // tracks file upload size
    let size = 0;

    // array to store incoming binary chunks - parts of image 
    const chunks = [];

    // chunks recieved for processing 
    req.on('data', chunk => {
        // increases size counter for each incoming chunk 
        size += chunk.length;

        // protection against large requests - if file size too large, stop uplodad 
        if (size > max_file_size) {
            req.destroy();
        }

        // each incoming chunk added to chunk array 
        chunks.push(chunk); 
    }); 

    // process file after upload 
    req.on('end', async () => {
        // combine all chunks into single buffer 
        const buffer = Buffer.concat(chunks);

        // split into multipart sections - boundary, header, main content
        const parts = splitBuffer(buffer, delimiter); 

        let fileBuffer = null;

        // file extension set to null 
        let fileExt = null;

        let isPNG = false;
        let isJPEG = false; 

        // loop through each multipart section 
        for (const part of parts) {

            // skip empty parts 
            if (!part.length) {
                continue; 
            }

            // find where headers end 
            const headerEnd = part.indexOf('\r\n\r\n');

            // skip if header + body split not found 
            if (headerEnd == -1) {
                continue; 
            }

            // extract headers 
            // convert everything to string 
            const header = part.slice(0, headerEnd).toString();

            // extract file content after headers 
            const body = part.slice(headerEnd + 4, part.lastIndexOf('\r\n')); 

            // skip non file fields 
            if (!header.includes('filename=')) {
                continue; 
            }

            // store data 
            fileBuffer = body; 

            // PNG signature
            // check first 8 bytes of file + compare with known PNG signature 
            isPNG = fileBuffer.slice(0, 8).equals(
                Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
            );

            // JPEG signature - in hexadecimal 
            // checks if file is JPEG using first 2 bytes 
            isJPEG = 
                fileBuffer[0] == 0xff &&
                fileBuffer[1] == 0xd8; 

            // file must be PNG or JPEG 
            if (isPNG) {
                fileExt = 'png'; 
            }
            else if (isJPEG) {
                fileExt = 'jpeg';
            }
            else {
                return res.status(400).send('Only PNG / JPEG files are allowed'); 
            }
            break; 
        } 

        // check file was found
        if (!fileBuffer) {
            return res.status(400).send('No file uploaded');
        }

        // check the file size - send an error message if its too large 
        if (fileBuffer.length > max_file_size) {
            return res.status(400).send('File too large');
        }

        // fully automated filename 
        const fileName = `user-pfp_${req.session.userId}_${Date.now()}.${fileExt}`;
    
        // safe storage path
        // filename automatically generated - prevents path traversal attacks 
        const uploadPath = path.join('uploads', fileName); 

        // get current profile picture
        const result = await pool.query(
            'SELECT profile_picture FROM users WHERE id = $1',
            [req.session.userId]
        );

        // delete old profile picture
        // get profile picture from 1st db row 
        // continue if no row exists 
        const { profile_picture } = result.rows[0] || {};

        if (profile_picture) {
            try {
                // delete old profile picture from disk 
                await fs.promises.unlink(`.${profile_picture}`); 
            } catch (err) {
                // ignore all errors 
            }
        }

        // rate limiting to prevent DDoS attacks
        // initialise timestamp - time of users last upload stored 
        if (!req.session.lastUpload) req.session.lastUpload = 0;

        // get current time (milliseconds)
        const now = Date.now();

        // rate limiting to prevent brute force attacks 
        // block uploads if time since last upload less than 5000 milliseconds
        if (now - req.session.lastUpload < 5000) {
            return res.status(429).send('Too many uploads'); 
        }

        // update last upload time if upload successful 
        req.session.lastUpload = now; 

        // writes file to disk 
        // ensures server finishes upload before moving on 
        await fs.promises.writeFile(uploadPath, fileBuffer); 

        // save path in database
        await pool.query(
            'UPDATE users SET profile_picture = $1 WHERE id = $2',
            [`/uploads/${fileName}`, req.session.userId]
        );

        // sends successful profile pic upload to frontend  
        // uploads stored separately 
        res.json({ success: true, path: `/uploads/${fileName}` });
    });
});

export default router; 