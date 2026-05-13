import fs from 'fs/promises';
import path from 'path';

const max_file_size = 5 * 1024 * 1024; // max file size = 5MB

// folder where uploaded files get saved, also served at /uploads
const uploadDir = 'uploads';

function splitBuffer(buffer, delimiter) {
  // deliimiter is used to split raw multipart request into separate sections

  // array to store split sections
  const parts = [];

  // starting position for searching the buffer
  let start = 0;

  while (true) {
    // find next occurence of delimiter from current position
    const index = buffer.indexOf(delimiter, start);

    if (index == -1) {
      // push remaining buffer if no delimiters found, and exit as done
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

// reads a multipart form upload, gives back the file (if there is one) and any text fields sent with it
export function parseFileUpload(req) {
  return new Promise((resolve, reject) => {
    // the plain text fields like title and content
    const fields = {};

    // checks content type of request using headers
    const contentType = req.headers['content-type'];

    // content type needs to be multipart form data
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return reject(new Error('Invalid request'));
    }

    // extract boundary - used to separate different sections in the request body

    // in multipart form, the content type header has a boundary value that contains a string
    const boundaryMatch = contentType.match(/boundary=(.+)$/); // use regex to grab the boundary from the header, one or more characters up to end of string

    // boundary not found
    if (!boundaryMatch) {
      return reject(new Error('Missing boundary'));
    }

    // extracts boundary string from content type header
    const boundary = boundaryMatch[1]; // just get the bit inside the brackets, which is the boundary value itself

    // creates delimiter to split form sections, use buffer.from throughout as request is binary not text, and cant use string operations really on binary data
    const delimiter = Buffer.from(`--${boundary}`); // as per spec,the deliminator in body actually has the boundary value but with two hyphens prepended

    // tracks file upload size
    let size = 0;

    // array to store incoming binary chunks which are parts of the file
    const chunks = [];

    let aborted = false;

    // chunks recieved for processing
    req.on('data', (chunk) => {
      // prevent double handling -
      if (aborted) {
        return;
      }
      // increases size counter for each incoming chunk
      size += chunk.length;

      // protection against large requests as if file size too large, stop uplodad
      if (size > max_file_size) {
        aborted = true;
        req.destroy(); // STOPS client from sending anymore data
        return reject(new Error('File too large'));
      }

      // each incoming chunk added to chunk array
      chunks.push(chunk);
    });

    // process file after upload
    req.on('end', async () => {
      if (aborted) return; // dont parse partial chunks if upload aborted
      try {
        // combine all chunks into single buffer
        const buffer = Buffer.concat(chunks);

        // split into the multipart sections: the boundary, the header, and the actual main content
        const parts = splitBuffer(buffer, delimiter);

        let fileBuffer = null;

        // file extension set to null
        let fileExt = null;

        let isPNG = false;
        let isJPEG = false;

        // loop through each multipart section
        for (const part of parts) {
          // each multipart section has headers then body, separated by a blank line (\r\n\r\n)

          // skip empty parts
          if (!part.length) {
            continue;
          }

          // find where headers end
          const headerEnd = part.indexOf('\r\n\r\n'); // position of the blank line ending the headers

          // skip if header + body split not found
          if (headerEnd == -1) {
            continue;
          }

          // extract headers
          const header = part.slice(0, headerEnd).toString();

          // extract body content after headers, add +4 to get past the \r\n\r\n to get to first byte of body. \r\n is at end of body before next boudnary so we get up to just before that, and have whole body
          const body = part.slice(headerEnd + 4, part.lastIndexOf('\r\n'));

          // no filename means this section is a normal text field not a file, so grab its name + value and move on
          if (!header.includes('filename=')) {
            // this is a normal form field such as a post tile or body text
            const nameMatch = header.match(/name="([^"]+)"/); // capturing group (), to get one or more characters that are NOT " (^ is negating here)
            if (nameMatch) {
              fields[nameMatch[1]] = body.toString().trim(); // extract name from between brackets and save name=value to fields map
            }
            continue;
          }
          // otherwise we have filename so this is file section

          // store data
          fileBuffer = body;

          // know we check file signatures, known as a magic-bytes check

          // PNG signature
          // check first 8 bytes of file + compare with known PNG signature
          isPNG = fileBuffer.slice(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

          // JPEG signature, in hexadecimal
          // checks if file is JPEG using first 2 bytes
          isJPEG = fileBuffer[0] == 0xff && fileBuffer[1] == 0xd8;

          // file must be PNG or JPEG
          if (isPNG) {
            fileExt = 'png';
          } else if (isJPEG) {
            fileExt = 'jpeg';
          } else {
            return reject(new Error('Only PNG / JPEG files are allowed'));
          }
          // dont break here, there might still be text fields after the file
        }

        // the file is optional (a post doesnt need an image) so if there wasnt one just send back the fields,
        // file stuff left null, and let the caller decide if thats ok
        resolve({ fileBuffer, fileExt, fields });
      } catch (err) {
        reject(err);
      }
    });
    // error handling
    req.on('error', reject);
  });
}

// saves a file into the uploads folder and returns the /uploads/ path for it, fileName made by us so write cant end up outside the folder
export async function saveUpload(fileBuffer, fileName) {
  await fs.mkdir(uploadDir, { recursive: true }); // make the folder if its not there yet
  await fs.writeFile(path.join(uploadDir, fileName), fileBuffer);
  return `/${uploadDir}/${fileName}`;
}

// deletes an old uploaded file given its /uploads/ path
export async function deleteUpload(publicPath) {
  const fileName = path.basename(publicPath); // just the filename bit, so we cant delete anything outside uploads
  try {
    await fs.unlink(path.join(uploadDir, fileName));
  } catch {
    // file might already be gone, so all good
  }
}
