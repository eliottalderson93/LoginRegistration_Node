// Require the Express Module
var express = require('express');
// Create an Express App
var app = express();
// Require body-parser (to receive post data from clients)
var bodyParser = require('body-parser');
// Integrate body-parser with our App
app.use(bodyParser.urlencoded({ extended: true }));
// Require path
var path = require('path');
// Setting our Static Folder Directory
app.use(express.static(path.join(__dirname, './static')));
// Setting our Views Folder Directory
app.set('views', path.join(__dirname, './views'));
// Setting our View Engine set to EJS
app.set('view engine', 'ejs');
//DATABASE/MONGOOSE
var mongoose = require('mongoose');

const bcrypt = require('bcrypt');

const session = require('express-session');

const flash = require('express-flash');

app.use(session({
    secret: 'keyboardkitteh',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 }
}));

app.use(flash());

mongoose.connect('mongodb://localhost/intro');

// Use native promises
Promise = require('bluebird');
mongoose.Promise = Promise;

//make schema
var UserSchema = new mongoose.Schema({
    name:{type: String},
    email: {type: String, required:true, maxlength:20},
    pw_hash:{type: String, required:true}
},{timestamps:true});

mongoose.model('User',UserSchema);

var User = mongoose.model('User');

app.get('/', function(req, res) {
    if(req.session.user_id != null){
        console.log(req.session.user_id);
        console.log("logged in: redirecting");
        res.redirect("/users/"+req.session.user_id);
    }
    // var allUsers = [];
    // User.find({}, function(err, users) {
    //     if(users){
    //         allUsers = users;
    //     }
    //     else{ //did not find
    //         console.log("did not find all users");
    //     }
    // });
    res.render('front.ejs');
})
// Add User Request 
app.post('/register', function(req, res) { //register
    console.log("POST DATA", req.body);
    if(validateEmail(req.body.email) != true){
        //flash error and redirect
        req.flash('registration','invalid email');
        res.redirect('/');
    }
    User.findOne({email:req.body.email},function(err,user){
        if(user != null){
            //flash error
            req.flash('registration', "you have already registered");
            console.log("not unique user");
            res.redirect('/');
        }
        else if(err){
            //flash error
            console.log("ERROR in FIND:",err);
            for(var key in err.errors){
                req.flash('registration', err.errors[key].message);
            }
            res.redirect('/');
        }
        else{
            //no user exists already and no error in query
            //this user can be created below
        }
    });
    bcrypt.hash(req.body.password, 10, function(err, hash){
        var user = new User({name: req.body.name, email: req.body.email, pw_hash:hash});
        if(err){
            console.log("could not hash");
            res.redirect("/");
        }
        user.save(function(err) {
            if(err) {
                console.log('something went wrong');
                for(var key in err.errors){
                    req.flash('registration', err.errors[key].message);
                }
                res.redirect("/");
            } 
            else {
                console.log('successfully added a user!');
                //console.log(user._id);
                console.log("USER:: ",user.email,user.pw_hash,user.name);
                req.session.user_id = user._id;
                console.log("SESSION ID:",req.session.user_id);
                res.redirect('/users/'+req.session.user_id);
            }
        })
        // .then(function(){
        //     var userDB = User.findOne({email:req.body.email});
        //     console.log("USER:: ",userDB.email,userDB.pw_hash,userDB.name);
        //     req.session.user_id = userDB._id;
        //     console.log("SESSION ID:",req.session.user_id);
        //     res.redirect('/users/'+req.session.user_id);
        // });
    });
});
app.post("/login",function(req,res){
    console.log("POST DATA", req.body);
    var Res = res;
    var Req = req;
    var myUser = User.findOne({email:req.body.login_email},function(err,user){
        var thisUser = user;
        if(user == null){
            //flash error
            req.flash('login', "register yo email");
            console.log("not unique user");
            return null;
        }
        var isValid = bcrypt.compare(req.body.login_password, user.pw_hash, function(err, res){
            if(res){
                Req.session.user_id = thisUser._id;
                return true;
            }
            else{
                console.log("password did not match");
                Req.flash("login","invalid login");
                return false;
            } 
            });
        if(isValid == false){
            return null;
        }
        else{
            return user;
        }
    }).then(function(){
        if(myUser != null){
            console.log("login promise session id: ",Req.session.user_id);
            Res.redirect('/users/'+Req.session.user_id);
        }
        else{
            Res.redirect('/');
        }
    });
        
    });
app.get("/users/:userId",function(req,res){
    console.log("entered user route with id: ", req.params.userId);
    User.findOne({_id:req.params.userId}, function(err,user){
        console.log("finding user");
        if(err){
            console.log("couldnt execute query");
        }
        else if(user == null){
            //flash error
            console.log("could not find user");
        }
        else{
            console.log("the user has been found: ",user);
            console.log("user._id: ", user._id, typeof(user._id));
            console.log("req.session.user_id: ", req.session.user_id, typeof(req.session.user_id));
            if(user._id.toString() !== req.session.user_id){
                console.log("session and login do not match");
            }
            else{
                res.render("user.ejs",{user:user});
                return; //needed to avoid header errors
            }
        }
        res.redirect('/logout');
    });
});
app.get("/logout",function(req,res){
    req.session.destroy();
    res.redirect("/");
});
// Setting our Server to Listen on Port: 
var localHostLocation = 8500;
app.listen(localHostLocation, function() { 
    console.log('listening on port:' + localHostLocation.toString()); 
    }).on('error', function(err) { 
        if (err.errno === 'EADDRINUSE') {
            console.log("port "+localHostLocation.toString() +' busy'); 
            localHostLocation += 500;
        }
        else { 
            console.log(err); 
        } 
    });

function validateEmail(email){
    var re = /\S+@\S+\.\S+/;
    return re.test(email);
}