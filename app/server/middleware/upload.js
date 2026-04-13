// handling file uploads manually
import express from 'express'; 
import fs from 'fs';
import path from 'path'; 
import pool from '../db.js'; 

const router = express.Router();

// set max file size to 5MB 
const max_file_size = 5 * 1024 * 1024; 

// upload profile picture route 
router.post('/upload-pfp', (req, res) => {
    // authentication check - checks user logged in before allowing upload 
    if (!req.session || !req.session.userId) {
        return res.status(400).send('Unauthorised');
    }

    // check content type 
    // uses multipart form data - checks content type of request using headers 
    const contentType = req.headers['content-type'];

    // content type needs to be multipart form data 
    if (!contentType || !contentType.includes('multipart/form-data')) {
        return res.status(400).send('Invalid request'); 
    }

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

        // find whee file content starts 
        const fileStart = buffer.indexOf(Buffer.from('\r\n\r\n')) + 4; 

        // find where file content ends
        const fileEnd = buffer.lastIndexOf(Buffer.from('\r\n')); 

        // extract buffer data 
        const fileBuffer = buffer.slice(fileStart, fileEnd); 

        // check that file exists 
        if (!fileBuffer) {
            return res.status(400).send('No file uploaded');
        }

        // check the file size - send an error message if its too large 
        if (fileBuffer.length > max_file_size) {
            return res.status(400).send('File too large');
        }

        // magic bytes - file signature validation - only trust JPEG and PNG files 

        // PNG signature
        // check first 8 bytes of file + compare with known PNG signature 
        const isPNG = fileBuffer.slice(0, 8).equals(
            Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
        );

        // JPEG signature - in hexadecimal 
        // checks if file is JPEG using first 2 bytes 
        const isJPEG = 
            fileBuffer[0] == 0xff &&
            fileBuffer[1] == 0xd8; 

        // file must be PNG or JPEG 
        if (!isPNG && !isJPEG) {
            return res.status(400).send('Only PNG / JPEG allowed');
        }

        // safe filename - no user input - prevents XSS + path traversal attacks 
        const ext = isPNG ? 'png' : 'jpeg'; 
        // fully automated filename 
        const fileName = `user-pfp_${req.session.userId}_${Date.now()}.${ext}`;
    
        // safe storage path 
        const uploadPath = path.join('uploads', fileName); 

        // delete old profile picture
        // get profile picture from 1st db row 
        // continue if no row exists 
        const { profile_picture } = Result.rows[0] || {};

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

        // saves file on disk 
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