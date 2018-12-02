var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");
var Teacher = require("../models/teacher");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
var middleware = require("../middleware");

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
// cloudinary.config({ 
//   cloud_name: 'walterhenrike', 
//   api_key: process.env.CLOUDINARY_API_KEY, 
//   api_secret: process.env.CLOUDINARY_API_SECRET
// });
cloudinary.config({ 
  cloud_name: 'walterhenrike', 
  api_key: '525274251929189', 
  api_secret: '_nm2MkNvFdYUNpAMYZWNy5Xg7Us'
});



//INDEX - show all Teachers
router.get("/", function(req, res) {
    res.render("landing");
});

//=============================================================================
// AUTH ROUTES

router.get("/register", function(req, res){
    res.render("register", {page: 'register'}); 
});

router.get("/regadm", function(req, res){
    res.render("regadm", {page: 'regadm'}); 
});




//confirmation and resend












//HANDLE SIGNUP LOGIC

router.post("/register", upload.single('image'), function(req, res, next){
  cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
      if(err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      // add cloudinary url for the image to the teacher object under image property
      //req.body.teacher.image = result.secure_url;
      // add image's public_id to teacher object
      //req.body.teacher.imageId = result.public_id;
      // add author to teacher
    
    var checkErr = false;
    
    var newUser = new User({
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        avatar: result.secure_url,
        imageId: result.public_id,
        about: req.body.about
      });
      
      newUser.isVerified = false;

    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err);
            checkErr = true;
            return res.render("register", {error: err.message});
        }
        
        else {
        async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
          if(err) {
        req.flash("error", "Something went wrong.");
        res.redirect("/");
      }
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/');
        }

        user.isVerifiedToken = token;
        user.isVerifiedExpires = Date.now() + 3600000*24; // 24 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'iratemyteacher@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'noreply@iratemyteacher.com',
        subject: 'iRateMyTeacher Account Verification',
        text: 'You are receiving this because you (or someone else) has registered a new account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/verified/' + token + '\n\n' +
          'If you did not request this, please ignore this email.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' . Please verify your account before using the system.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/');
  });
        }
    });
  });
});


router.post("/regadm", upload.single('image'), function(req, res){
  
  cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
      if(err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
    var newUser = new User({
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        avatar: result.secure_url,
        imageId: result.public_id,
        about: req.body.about
      });

    if(req.body.adminCode === 'secretcode123') {
      newUser.isAdmin = true;
      newUser.isVerified = true;
    }

    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.render("register", {error: err.message});
        }
        passport.authenticate("local")(req, res, function(){
           req.flash("success", "Welcome to IRMT " + req.body.username);
           res.redirect("/teachers"); 
        });
    });
  });
});

//SHOW LOGIN FORM

router.get("/login", function(req, res){
    res.render("login", {page: 'login'}); 
});

// HANDLING LOGIN LOGIC

router.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { 
        req.flash("error","Check entered data!");
        res.redirect("/login");
    }
    if (!user) {
        req.flash("error","Check entered data!");
        return res.redirect('/login'); 
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      req.flash("success", "Successfully logged in, welcome to IRMT!");
      var redirectTo = req.session.redirectTo ? req.session.redirectTo : '/teachers';
      delete req.session.redirectTo;
      res.redirect(redirectTo);
    });
  })(req, res, next);
});

// LOGOUT ROUTE
router.get("/logout", function(req, res) {
    req.logout();
    req.flash("success","Logged you out!");
    res.redirect("/teachers");
});

// Middleware
function isLoggedIn(req, res, next) {
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}

// forgot password
router.get('/forgot', function(req, res) {
  res.render('forgot');
});

router.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
          if(err) {
        req.flash("error", "Something went wrong.");
        res.redirect("/");
      }
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'iratemyteacher@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'noreply@iratemyteacher.com',
        subject: 'iRateMyTeacher Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if(err) {
        req.flash("error", "Something went wrong.");
        res.redirect("/");
      }
      if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if(err) {
        req.flash("error", "Something went wrong.");
        res.redirect("/");
      }
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
              if(err) {
            req.flash("error", "Something went wrong.");
            res.redirect("/");
          }
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
                if(err) {
                req.flash("error", "Something went wrong.");
                res.redirect("/");
              }
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'iratemyteacher@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'noreply@iratemyteacher.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
      if(err) {
        req.flash("error", "Something went wrong.");
        res.redirect("/");
      }
    res.redirect('/teachers');
  });
});

// USER PROFILE
router.get("/users/:id", function(req, res) {
  User.findById(req.params.id, function(err, foundUser) {
    if(err) {
      req.flash("error", "Something went wrong.");
      return res.redirect("/");
    }
    Teacher.find().where('author.id').equals(foundUser._id).exec(function(err, teachers) {
      if(err) {
        req.flash("error", "Something went wrong.");
        return res.redirect("/");
      }
      res.render("users/show", {user: foundUser, teachers: teachers});
    })
  });
});

// verify password
router.get('/verify', function(req, res) {
  res.render('verify');
});

router.post('/verify', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
          if(err) {
        req.flash("error", "Something went wrong.");
        res.redirect("/");
      }
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/verify');
        }

        user.isVerifiedToken = token;
        user.isVerifiedExpires = Date.now() + 3600000*24; // 24 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'iratemyteacher@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'noreply@iratemyteacher.com',
        subject: 'iRateMyTeacher - new verification code',
        text: 'You are receiving this because you (or someone else) have requested a new verification code for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/verified/' + token + '\n\n' +
          'If you did not request this, please ignore this email.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

router.get('/verified/:token', function(req, res) {
  var checkErr = false;
  var controlCheck = false;

  if (!checkErr) {
      
  async.waterfall([
    function(done) {
        User.findOne({ isVerified: false, isVerifiedToken: req.params.token, isVerifiedExpires: { $gt: Date.now() } }, function(err, user) {
        if(err) {
        req.flash("error", "Something went wrong.");
        res.redirect("/");
      }
        if (!user) {
          req.flash('error', 'Verification token is invalid, has expired or the account is already verified.');
          return res.redirect('/teachers');
        }
        if("a" === "a") {
          if(err) {
            req.flash("error", "Something went wrong.");
            res.redirect("/");
          }
            user.isVerifiedToken = undefined;
            user.isVerifiedExpires = undefined;
            user.isVerified = true;

            user.save(function(err) {
                if(err) {
                req.flash("error", "Something went wrong.");
                res.redirect("/");
              }
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'iratemyteacher@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'noreply@iratemyteacher.com',
        subject: 'Your account has been verified',
        text: 'Hello,\n\n' +
          'This is a confirmation that your account ' + user.email + ' has been verified.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your account has been verified.');
        done(err);
      });
    }
  ], function(err) {
      if(err) {
        req.flash("error", "Something went wrong.");
        res.redirect("/");
      }
    res.redirect('/teachers');
  })};
});


//EDIT ROUTE

router.get("/users/:id/edit", middleware.isLoggedIn, function(req, res){
  //render edit template with that Teacher
  res.render("users/edit", {user: req.user});
});

router.put("/users/:id", upload.single('image'), middleware.isLoggedIn, middleware.checkUserEdit, function(req, res){
    User.findById(req.params.id, async function(err, user){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            if (req.file) {
                if (req.file.path != null) {
                    try {
                      cloudinary.v2.uploader.destroy(user.imageId);
                      var result = await cloudinary.v2.uploader.upload(req.file.path);
                      user.imageId = result.public_id;
                      user.avatar = result.secure_url;
                    } catch(err) {
                        req.flash("error", err.message);
                        return res.redirect("back");
                    }
                    user.firstName = req.body.firstName;
                    user.lastName = req.body.lastName;
                    user.email = req.body.email;
                    user.about = req.body.about;
                    user.save();
                    req.flash("success","Successfully Updated!");
                    res.redirect("/users/" + user._id);
                }
            }
            else {
                    user.firstName = req.body.firstName;
                    user.lastName = req.body.lastName;
                    user.email = req.body.email;
                    user.about = req.body.about;
                    user.save();
                    req.flash("success","Successfully Updated!");
                    res.redirect("/users/" + user._id);
            }
        }
    });
});



module.exports = router;