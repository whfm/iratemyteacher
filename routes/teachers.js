var express = require("express");
var router = express.Router();
var Teacher = require("../models/teacher");
var middleware = require("../middleware");
var Review = require("../models/review");
var Comment = require("../models/comment");
var async = require("async");
var await = require("await");


//*************************
// Image Uploader
//*************************

var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


//*************************
// Teacher routes
//*************************

router.get("/", function(req, res){
    var noMatch = null;
    if(req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        // Get all Teachers from DB
        Teacher.find({name: regex}, function(err, allTeachers){
           if(err){
               console.log(err);
           } else {
              if(allTeachers.length < 1) {
                  noMatch = "No Teachers match that query, please try again.";
                  req.flash('error', noMatch);
                  return res.redirect('/teachers');
              }
              res.render("teachers/index",{ Teachers:allTeachers, noMatch: noMatch, page: 'teachers'});
           }
        });
    } else {
        // Get all Teachers from DB
        Teacher.find({}, function(err, allTeachers){
           if(err){
               console.log(err);
           } else {
              res.render("teachers/index",{ Teachers:allTeachers, noMatch: noMatch, page: 'teachers'});
           }
        });
    }
});

//CREATE - add new Teacher to the database

router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) {
    cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
      if(err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      // add cloudinary url for the image to the teacher object under image property
      req.body.teacher.image = result.secure_url;
      // add image's public_id to teacher object
      req.body.teacher.imageId = result.public_id;
      // add author to teacher
      req.body.teacher.author = {
        id: req.user._id,
        username: req.user.username
      }
      Teacher.create(req.body.teacher, function(err, teacher) {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('back');
        }
        res.redirect('/teachers/' + teacher.id);
      });
    });
});

//NEW - Show form to create new Teacher
router.get("/new", middleware.isLoggedIn, function(req, res) {
    res.render("teachers/new");
});

// SHOW - shows more info about one Teacher

router.get("/:id", function (req, res) {
    //find the teacher with provided ID
    Teacher.findById(req.params.id).populate("comments").populate({
        path: "reviews",
        options: {sort: {createdAt: -1}}
    }).exec(function (err, foundTeacher) {
        if(err || !foundTeacher){
            console.log(err);
            req.flash('error', 'Sorry, that Teacher does not exist!');
            return res.redirect('/teachers');
        } else {
            //render show template with that teacher
            res.render("teachers/show", {Teacher: foundTeacher});
        }
    });
});

// EDIT Teacher ROUTE
router.get("/:id/edit", middleware.isLoggedIn, middleware.checkTeacherOwnership, function(req, res){
  //render edit template with that Teacher
  res.render("teachers/edit", {Teacher: req.Teacher});
});

// UPDATE Teacher ROUTE

router.put("/:id", upload.single('image'), middleware.isLoggedIn, middleware.checkTeacherOwnership, function(req, res){
    Teacher.findById(req.params.id, async function(err, teacher){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            if (req.file) {
                if (req.file.path != null) {
                    try {
                      cloudinary.v2.uploader.destroy(teacher.imageId);
                      var result = await cloudinary.v2.uploader.upload(req.file.path);
                      teacher.imageId = result.public_id;
                      teacher.image = result.secure_url;
                    } catch(err) {
                        req.flash("error", err.message);
                        return res.redirect("back");
                    }
                    teacher.name = req.body.name;
                    teacher.description = req.body.description;
                    teacher.save();
                    req.flash("success","Successfully Updated!");
                    res.redirect("/teachers/" + teacher._id);
                }
            }
            else {
                    teacher.name = req.body.name;
                    teacher.description = req.body.description;
                    teacher.save();
                    req.flash("success","Successfully Updated!");
                    res.redirect("/teachers/" + teacher._id);
            }
        }
    });
});

// DESTROY Teacher ROUTE


// DESTROY TEACHER ROUTE
router.delete("/:id", middleware.checkTeacherOwnership, function (req, res) {
    Teacher.findById(req.params.id, function (err, teacher) {
        if (err) {
            res.redirect("/teachers");
        } else {
            // deletes all comments associated with the teacher
            Comment.remove({"_id": {$in: teacher.comments}}, function (err) {
                if (err) {
                    console.log(err);
                    return res.redirect("/teachers");
                }
                // deletes all reviews associated with the teacher
                Review.remove({"_id": {$in: teacher.reviews}}, function (err) {
                    if (err) {
                        console.log(err);
                        return res.redirect("/teachers");
                    }
                    //  delete the teacher
                    teacher.remove();
                    req.flash("success", "Campground deleted successfully!");
                    res.redirect("/teachers");
                });
            });
        }
    });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;