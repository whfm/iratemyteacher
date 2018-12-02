var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    avatar: String,
    imageId: String,
    firstName: String,
    lastName: String,
    about: String,
    email: { type: String, unique: true },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isAdmin: {type: Boolean, default: false},
    isVerified: {type: Boolean, default: false},
    isVerifiedToken: String,
    isVerifiedExpires: Date
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);