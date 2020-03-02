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

exports.deletePost = async (req, res) => {
    const { _id } = req.post;

    if(!req.isPoster) {
        return res.status(400).json({
            message: "You are not authorized to perform this action......."
        });
    }

    const deletedPost = await Post.findOneAndDelete({ _id });

    res.json(deletedPost);
};

exports.getPostById = async (req, res, next, id) => {
    const post = await Post.findOne({ _id: id });
    req.post = post;

    const posterId = mongoose.Types.ObjectId(req.post.postedBy._id);
    if (req.user && posterId.equals(req.user._id)) {
        req.isPoster = true;
        return next();
    }
    next();
};

exports.getPostsByUser = async (req, res) => {
    const posts = await Post.find({ postedBy: req.profile._id })
        .sort({
            // recent posts at top
            createdAt: "desc"
        })

    res.json(posts);

};

exports.getPostFeed = async (req, res) => {
    const { following, _id } = req.profile;

    // to add our posts to the list as well as the people we're following
    following.push(_id);

    const posts = await Post.find({ postedBy: { $in: following } })
        .sort({
            createdAt: 'desc'
        })

    res.json(posts);
};

exports.toggleLike = async (req, res) => {
    const { postId } = req.body;

    const post = await Post.findOne({ _id: postId });
    
    // because likes array is not a string
    const likeIds = post.likes.map( id => id.toString());
    const authUserId = req.user._id.toString();

    if(likeIds.includes(authUserId)) {
        // if you've already liked it, toggle it to unlike
        await post.likes.pull(authUserId);
    } else {
        await post.likes.push(authUserId);
    }

    await post.save();

    res.json(post);
};

exports.toggleComment = async (req, res) => {
    const { comment, postId } = req.body;
    let operator;
    let data;

    if (req.url.includes('uncomment')) {
        operator = "$pull";
        data = { _id: comment._id}
    } else {
        operator = "$push";
        data = { text: comment.text, postedBy: req.user._id };
    }

    const updatedPost = await Post.findOneAndUpdate(
        { _id: postId },
        { [operator]: { comments: data }},
        { new: true }
    ).populate('postedBy', "_id name avatar")
    .populate('comments.postedBy', '_id name avatar');

    res.json(updatedPost);
};
