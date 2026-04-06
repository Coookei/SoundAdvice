import './config.js'; 
import app from './app.js';
import express from 'express';
import path from 'path'; 

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.use('/uploads', express.static(path.resolve('uploads'))); 