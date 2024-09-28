const userModel = require("../models/user");
const bcrypt = require('bcrypt');
const { getResponseMsg } = require('../helpers/default_values');

const deleteUser = ((req, res) => {
    var resourceId = decodeURIComponent(req._resourceId.replace(/_/g, '.'));
    userModel.deleteOne({"email":resourceId}, function (err, result) {
        if(err){
            console.log(err)
            return res.status(401).json(err);
        }
        res.json(getResponseMsg('success'));
    });
});

const getUser = ((req, res) => {
    var resourceId = decodeURIComponent(req._resourceId.replace(/_/g, '.'));
    userModel.findOne({"email":resourceId}, function (err, result) {
        if(err){
            console.log(err)
            return res.status(401).json(err);
        }
        response = req.resource.getMapper(null, 1)(result);
        response['Enabled'] = true;  //TODO
        response['Locked'] = false;  //TODO
        res.json(response);
    }).select('-__v');
});

const editUser = async function (req, res){
    var me = req.me;
    var user_id = me._id;
    if(req.body.oldpassword === undefined || req.body.newpassword === undefined){
        return res.status(400).json(getResponseMsg('invalid_parameter'));
    }
    if(req.body.oldpassword === req.body.newpassword){
        return res.status(400).json({message: "The new password cannot be the same as the old one."});
    }
    userModel.findById(user_id, async function (err, user){
        if(!user){
            return res.status(400).json({message: "User not Found."});
        }
        const isMatch = await bcrypt.compare(req.body.oldpassword, user.password);
        if(!isMatch){
            return res.status(400).json({message: "The old password was entered incorrectly."});
        }
        user.password = req.body.newpassword;
        user.save((err, result) => {
            if(err) {
                console.log(err);
                return res.send(err);
            }
            return res.json(getResponseMsg('success'));
        });
    });
};

const createUser =  ((req, res) => {
    userModel.findOne({email: req.body.email}, function (err, user){
        if(user){
            return res.status(409).json({message: "Email already exist."});
        } else {
            // create user model
            const user = new userModel({ 
                "email": req.body.email,
                "password": req.body.password
            });
            user.save((err, result) => {
                if(err) {
                    console.log(err);
                    return res.send(err);
                }else{
                    return res.json(getResponseMsg('success'));
                }
            });
        }
    }).select("id email");

});

module.exports = {
    getUser,
    createUser,
    deleteUser,
    editUser
};