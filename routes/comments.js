var express = require("express");
var router = express.Router({mergeParams: true});
var Teacher = require("../models/teacher");
var Comment = require("../models/comment");
var middleware = require("../middleware");

//*************************
// Comments routes
//*************************

router.get("/new", middleware.isLoggedIn, function(req, res) {
    Teacher.findById(req.params.id, function(err, Teacher){
        if (err) {
            console.log(err);
        } 
        else {
             res.render("comments/new", {Teacher:Teacher});
        }
    });
});

// Comments create
router.post("/", middleware.isLoggedIn, function(req, res){
    Teacher.findById(req.params.id, function(err, Teacher) {
       if(err){
           res.redirect("/teachers");
       } 
       else {
           Comment.create(req.body.comment, function(err, comment){
              if(err){
                  req.flash("error", "Something went wrong");
                  console.log(err);
              } 
              else {
                  //add username and id to comment
                  comment.author.id = req.user._id;
                  comment.author.username = req.user.username;
                  //save comment
                  comment.save();
                  Teacher.comments.push(comment);
                  Teacher.save();
                  req.flash("success", "Successfully added comment!");
                  res.redirect("/teachers/" + Teacher._id);
              }
           });
       }
    });
});

// Comments edit route

router.get("/:comment_id/edit",function(req, res){
    Comment.findById(req.params.comment_id,function(err, foundComment){
        if(err){
            res.redirect("back");
        } else {
           res.render("comments/edit", {Teacher_id: req.params.id, comment: foundComment}); 
        }
    });
});

// COMMENT UPDATE
router.put("/:comment_id", middleware.checkCommentOwnership, function(req, res){
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
        if (err){
            res.redirect("back");
        } 
        else {
            res.redirect("/teachers/" + req.params.id);
        }
    });
});

// COMMENT DESTROY ROUTE
router.delete("/:comment_id", middleware.checkCommentOwnership, function(req, res){
    Comment.findByIdAndRemove(req.params.comment_id, function(err) {
        if (err) {
            res.redirect("back");
        }
        else {
            req.flash("success", "Comment deleted!");
            res.redirect("/teachers/" + req.params.id);
        }
    });
});

module.exports = router;
