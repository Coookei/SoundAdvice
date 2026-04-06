// use multer to handle pfp upload - form submission
import multer from 'multer'; 

// create multer instance
const upload = multer ({
    // use memory storage - faster upload as uploads files in RAM
    // allows manual upload to supabase  
    storage: multer.memoryStorage(),
    // limit file size to 5MB max 
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    // only allow image files - prevents random + potentially malicious file upload 
    // file filter - request object, uploaded file, callback function in multer 
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            // if type = image, accept file 
            cb(null, true); // callback function - (error, accept)
        } else {
            // reject non image files 
            cb(new Error('Only image files are allowed'), false);
        }
    }
}); 

// export upload middleware - use in routes 
export default upload; 