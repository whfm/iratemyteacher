//ALL THE MIDDLEWARE GOES HERE

var Teacher = require("../models/teacher");
var Comment = require("../models/comment");
var User = require("../models/user")
var Review = require("../models/review");
var middlewareObj = {

};

middlewareObj.checkTeacherOwnership = function(req, res, next){
    if (req.isAuthenticated()){
        Teacher.findById(req.params.id, function(err, foundTeacher){
            if(err || !foundTeacher){
                console.log(err);
                req.flash('error', 'Sorry, that Teacher does not exist!');
                res.redirect('/teachers');
            }
            else if(foundTeacher.author.id.equals(req.user._id) || req.user.isAdmin){
                req.Teacher = foundTeacher;
                next();
            }
            else {
                req.flash('error', 'You don\'t have permission to do that!');
                res.redirect('/teachers/' + req.params.id);
            }
        });
    }
};

middlewareObj.checkCommentOwnership = function(req, res, next){
    if(req.isAuthenticated()){ // if user is logged in
        Comment.findById(req.params.comment_id, function(err, foundComment){
            if(err){
                res.redirect("back");
            } else{
                if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin){ //does user owns the Teacher
                    next();
                } else {
                    res.redirect("back");
                }
            }
        });
    } else {
        res.redirect("back");
    }
};

middlewareObj.isLoggedIn = function(req, res, next) {
    var identified = false;
    if(req.isAuthenticated()){
         User.findOne({ username: req.user.username }, function(err, user) {
            if(err) {
                req.flash("error", "Something went wrong.");
                res.redirect("/");
        }

        if (!req.user.isVerified) {
            req.flash("error", "You need to verify your e-mail before posting.");
        }
        });
         
        if (req.user.isVerified) {
            identified = true;
            return next();
        }
        else {
            req.flash("error", "You need to verify your e-mail before posting.");
         }
    }
    if (identified) {
        return next();
    }
    else {
    req.session.redirectTo = req.originalUrl;
    req.flash("error", "You need to be logged in and to verify your account to do that.");
    res.redirect("/login");
    }
};

middlewareObj.checkReviewOwnership = function(req, res, next) {
    if(req.isAuthenticated()){
        Review.findById(req.params.review_id, function(err, foundReview){
            if(err || !foundReview){
                res.redirect("back");
            }  else {
                // does user own the comment?
                if(foundReview.author.id.equals(req.user._id)) {
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
};

middlewareObj.checkReviewExistence = function (req, res, next) {
    if (req.isAuthenticated()) {
        Teacher.findById(req.params.id).populate("reviews").exec(function (err, foundCampground) {
            if (err || !foundCampground) {
                req.flash("error", "Campground not found.");
                res.redirect("back");
            } else {
                // check if req.user._id exists in foundCampground.reviews
                var foundUserReview = foundCampground.reviews.some(function (review) {
                    return review.author.id.equals(req.user._id);
                });
                if (foundUserReview) {
                    req.flash("error", "You already wrote a review.");
                    return res.redirect("back");
                }
                // if the review was not found, go to the next middleware
                next();
            }
        });
    } else {
        req.flash("error", "You need to login first.");
        res.redirect("back");
    }
};


middlewareObj.checkUserEdit = function(req, res, next) {
    if(req.isAuthenticated()){
        if(req.user._id.equals(req.user._id)) {
                next();
            } else {
                req.flash("error", "You don't have permission to do that");
                res.redirect("back");
            }
        }
        //});
     else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
};

module.exports = middlewareObj;
