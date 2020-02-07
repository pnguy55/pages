const mongoose = require('mongoose');
const User = mongoose.model('User');
// image uploading and resizing
const multer = require('multer');
// write to filesystem
const jimp = require('jimp');

exports.getUsers = async (req, res) => {
    const users = await User.find().select('_id name email createdAt updatedAt');
    res.json(users);
};

exports.getAuthUser = (req, res) => {
    if (!req.isAuthUser) {
        return res.status(403).json({
            message:"You are unauthenticated. Please sign in or sign up."
        });

        res.redirect('/signin');
    }
    
    res.json(req.user);

};

exports.getUserById = async (req, res, next, id) => {
    const user = await User.findOne({ _id: id})
    req.profile = user;

    const profileId = mongoose.Types.ObjectId(req.profile._id);

    if (profileId.equals(req.user._id)) {
        req.isAuthUser = true;
        return next();
    }
    next();
};

// follower profiles are autopopulated on in the User model
exports.getUserProfile = (req, res) => {
    // in the get userbyid function we attach profile to the req
    if (!req.profile) {
        return res.status(404).json({
            message: "No user found"
        });
    }
    res.json(req.profile);
};

exports.getUserFeed = async (req, res) => {
    const { following, _id } = req.profile

    // cannot follow self so no need to include self in user feed
    following.push(_id);
    // find users not included in the following array
    const users = await User.find({ _id: { $nin: following } })
        .select(
            "_id name avatar"
        );
        res.json(users);
};

const avatarUploadOptions = {
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

exports.uploadAvatar = multer(avatarUploadOptions).single('avatar')

exports.resizeAvatar = async (req, res, next) => {
    // multer automatically sticks the file onto req object
    if(!req.file) {
        return next();
    }
    // split followed by [1] allows us to grab the second portion of the filename (the filename itself)
    const extension = req.file.mimetype.split('/')[1]
    req.body.avatar = `/static/uploads/avatars/${req.user.name}-${Date.now()}.${extension}`;
    const image = await jimp.read(req.file.buffer);
    await image.resize(250, jimp.AUTO);
    await image.write(`./${req.body.avatar}`)
    next();
};

exports.updateUser = async (req, res) => {
    req.body.updateAt = new Date().toISOString();
    const updatedUser = await User.findOneAndUpdate(
        { _id: req.user._id },
        { $set: req.body },
        { new: true, runValidators: true }
    )

    res.json(updatedUser);
};

exports.deleteUser = async (req, res) => {
    const { userId } = req.params;

    if (!req.isAuthUser) {
        return res.status(400).json({
            message: "You are not authorized to perform this action."
        })
    }

    const deletedUser = await User.findOneAndDelete({ _id: userId })
    res.json(deletedUser)
};

exports.addFollowing = async (req, res, next) => {
    const { followId } = req.body;

    await User.findOneAndUpdate(
        { _id: req.user._id },
        { $push: { following: followId } }
    )
    next();
};

exports.addFollower = async (req, res) => {
    const { followId } = req.body;

    const user = await User.findOneAndUpdate(
        { _id: followId },
        { $push: { followers: req.user._id } },
        { new: true }
    );

    res.json(user);
};

exports.deleteFollowing = async (req, res, next) => {
    const { followId } = req.body;

    await User.findOneAndUpdate(
        { _id: req.user._id },
        { $pull: { followers: followId }}
    );

    next();
};

exports.deleteFollower = async (req, res) => {
    const { followId } = req.body;

    const user = await User.findOneAndUpdate(
        { _id: followId },
        { $pull: { following: req.user._id } },
        { new: true}
    );

    res.json(user);
};
