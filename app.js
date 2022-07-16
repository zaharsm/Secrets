//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const findOrCreate = require('mongoose-find-or-create');

const app = express();

app.set('view engine', 'ejs');

mongoose.connect("mongodb+srv://admin-zahar:"+process.env.PASSWORD+"@cluster0.htnzu.mongodb.net/userDB");

const userSchema = new mongoose.Schema ({
    email : String,
    password : String,
    googleId : String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


app.use(session({
    secret : "our little secret",
    resave : false,
    saveUninitialized : true,
}))

app.use(passport.initialize());
app.use(passport.session());

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  })

passport.use(new GoogleStrategy({
    
    clientID:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: " https://zahar-secret.herokuapp.com/auth/google/secrets",
    passReqToCallback   : true,
  },
  function(request, accessToken, refreshToken, profile, done) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

app.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));

app.get( '/auth/google/secrets',
    passport.authenticate( 'google', {
        successRedirect: '/secrets',
        failureRedirect: '/login'
}));

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.get("/",function(req,res){
    res.render("home");
});

app.get("/register",function(req,res){
    res.render("register");
})

app.get("/login",function(req,res){
    res.render("login");
})

app.get("/logout",function(req,res){
    req.logout(function(err) {
        if (err){
            console.log(err);
        }else{
            res.redirect("/");
        }});
});

app.get("/secrets",function(req,res){
    User.find({"secret":{$ne:null}},function(err,foundUsers){
        if(err){
            console.log(err);
        }else{
            if(foundUsers){
                res.render("secrets",{usersWithSecrets:foundUsers});
            }
        }
    })
})

app.post("/register",function(req,res){
   User.register({username: req.body.username}, req.body.password, function(err,user){
    if(err){
        console.log(err);
    }else{
            passport.authenticate("local")(req,res, function(){
                res.redirect("/secrets");  
            })
    }
   })
})

app.post("/login",function(req,res){
   
    const user = new User({
        username : req.body.username,
        password : req.body.password
    });

    req.login(user,function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res, function(){
                res.redirect("/secrets");  
            })
        }
    })
})

app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
})

app.post("/submit",function(req,res){
    const submittedSecret = req.body.secret;

    console.log(req.user.id);
    User.findById(req.user.id,function(err,foundUser){
        if(err){
            console.log(err)
        }else{
            if(foundUser){
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
             }
        }
    })
})

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started on port 3000");
});