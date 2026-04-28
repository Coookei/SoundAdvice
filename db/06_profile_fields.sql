-- profile fields shown on the user profile page
ALTER TABLE users ADD COLUMN bio             TEXT;
ALTER TABLE users ADD COLUMN profile_picture TEXT;
