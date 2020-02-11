const multer = require('multer');
const mongoose = require('mongoose');
const jimp = require('jimp');
const Post = mongoose.model('Post');


const imageUploadOptions = {
    storage: multer.memoryStorage(),
    limits: {
        // storing image files up to 1mb
        fileSize: 1024 * 1024 * 1    
    },
    fileFilter: (req, file, next) => {
        if (file.mimetype.startsWith('image/')) {
            next(null, true);
        } else {
            next(null, false);
        }
    }
};

exports.uploadImage = multer(imageUploadOptions).single('image')

exports.resizeImage = async (req, res, next) => {
    // multer automatically sticks the file onto req object
    if(!req.file) {
        return next();
    }
    // split followed by [1] allows us to grab the second portion of the filename (the filename itself)
    const extension = req.file.mimetype.split('/')[1]
    req.body.image = `/static/uploads/images/${req.user.name}-${Date.now()}.${extension}`;
    const image = await jimp.read(req.file.buffer);
    await image.resize(750, jimp.AUTO);
    await image.write(`./${req.body.image}`)
    next();
};

exports.addPost = async (req, res) => {
    req.body.postedBy = req.user._id;
    const post = await new Post(req.body).save()
    await Post.populate(post, {
        path: 'postedBy',
        select: '_id name avatar'
    })

    res.json(post);

};

exports.deletePost = () => {};

exports.getPostById = () => {};

exports.getPostsByUser = () => {};

exports.getPostFeed = () => {};

exports.toggleLike = () => {};

exports.toggleComment = () => {};
