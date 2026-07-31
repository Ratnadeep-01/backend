import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import {deleteFromCloudinary, uploadCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from "jsonwebtoken";
import fs from "fs";
import mongoose, { isValidObjectId } from 'mongoose';


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave : false});

        return {accessToken, refreshToken};

    } catch (error) {
        console.error("CRITICAL ERROR IN TOKEN GENERATION:", error);
        
        throw new ApiError(500, error?.message || "Something went wrong while generating tokens");
    }
}

const registerUser = asyncHandler( async(req, res) => {
    try {
        const {username, email, password, fullName} = req.body;

        const userExist = await User.findOne({
            $or : [{email}, {username}]
        })

        if(userExist){
            throw new ApiError(409, "user already exists with this username or email");
        }

        const avatarLocalPath = req.files?.avatar?.[0]?.path;
        const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
        
        let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || username)}&background=ae7aff&color=fff`;
        if (avatarLocalPath) {
            const avatar = await uploadCloudinary(avatarLocalPath);
            if (avatar?.url) avatarUrl = avatar.url;
        }
        
        let coverImageUrl = "";
        if (coverImageLocalPath) {
            const coverImage = await uploadCloudinary(coverImageLocalPath);
            if (coverImage?.url) coverImageUrl = coverImage.url;
        }

        const user = await User.create({
            fullName,
            email,
            avatar: avatarUrl,
            coverImage: coverImageUrl,
            password,
            username: username.toLowerCase()
        })

        const createdUser =  await User.findById(user._id).select(
            "-password -refreshToken"
        )

        if(!createdUser){
            throw new ApiError(500, "something went wrong while registering the user")
        }

        return res.status(201).json(
            new ApiResponse(201, createdUser, "Registration successful")
        );
    } catch (error) {
        // Clean up any uploaded local files on failure
        if (req.files) {
            const files = Object.values(req.files).flat();
            for (const file of files) {
                if (file.path && fs.existsSync(file.path)) {
                    try {
                        fs.unlinkSync(file.path);
                    } catch (unlinkError) {
                        console.error("Failed to delete temp file:", unlinkError);
                    }
                }
            }
        }
        throw error;
    }
})

const loginUser = asyncHandler(async(req,res)=>{
    const {username, email, password} = req.body;
    // if(!(username || email)){
    //     throw new ApiError(400, "email or username required");
    // }
    // if(!password){
    //     throw new ApiError(400, "password is required");
    // }

    const user = await User.findOne({
        $or : [{email}, {username}]
    })

    if(!user){
        throw new ApiError(404, "user does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401, "invalid login credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly : true,
        secure : process.env.NODE_ENV === "production"
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {user : loggedInUser, accessToken, refreshToken}, "user logged in successfully"))
})

const logoutUser = asyncHandler(async(req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set :{
                refreshToken : undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly : true,
        secure : process.env.NODE_ENV === "production"
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out successfully"))
})

const refreshAccessToken = asyncHandler(async(req, res) => {
    const refreshTokenFromClient = req.cookies?.refreshToken || req.header("Authorization")?.replace("Bearer ", "");

    if(!refreshTokenFromClient){
        throw new ApiError(401, "unauthorised request")
    }

    try {
        const decodedToken = jwt.verify(refreshTokenFromClient, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id);

        if(!user){
            throw new ApiError(401, "invalid refresh token")
        }

        if(refreshTokenFromClient !== user?.refreshToken){
            throw new ApiError(401, "refresh token is expired or used")
        }

        const {accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefreshToken(user._id);

        const options = {
            httpOnly : true,
            secure : process.env.NODE_ENV === "production"
        }

        return res.status(200)
        .cookie("accessToken", accessToken, {...options, maxAge: 15 * 60 * 1000})
        .cookie("refreshToken", newRefreshToken, { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 })
        .json(new ApiResponse(200, {accessToken, refreshToken: newRefreshToken}, "refresh token generated successfully"))

    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }
})

const changePassword = asyncHandler(async(req,res) => {
    const {currentPassword, newPassword, confirmNewPassword} = req.body;

    if(!(currentPassword && newPassword && confirmNewPassword)){
        throw new ApiError(400, "all fields are required");
    }
    if(newPassword !== confirmNewPassword){
        throw new ApiError(400, "new password and confirm new password is not same");
    }

    const user = await User.findById(req.user._id);
    const isCurrentPasswrdValid = await user.isPasswordCorrect(currentPassword);
    if(!isCurrentPasswrdValid){
        throw new ApiError(401, "current password is incorrect");
    }

    user.password= newPassword;
    await user.save({validateBeforeSave: false});

    return res.status(200).json(new ApiResponse(200, {}, "password changed successfully"));  
})

const forgotPassword = asyncHandler(async(req,res) => {
    const {email} = req.body;

    const user = await User.findOne({email});

    if(!user){
        throw new ApiError(404, "user does not exist");
    }

    // Here you would typically generate a reset token and send it to the user's email
    // For now, we'll just return a success message

    return res.status(200).json(new ApiResponse(200, {}, "password reset link sent to your email"));
})

const getCurrentUser = asyncHandler(async(req, res)=> {
    return res
    .status(200)
    .json(new ApiResponse(200, {user : req.user}, "current user fetched successfully"))
})

const updateUserProfile = asyncHandler(async(req, res) => {
    const {fullName, username, email} = req.body;

    if(!fullName && !username && !email){
        throw new ApiError(400, "at least one field is required to update")
    }

    const updateFields = {}
    if (fullName) updateFields.fullName = fullName
    if (username) {
        const usernameExists = await User.findOne({ username: username.toLowerCase(), _id: { $ne: req.user._id } })
        if (usernameExists) {
            throw new ApiError(409, "Username is already taken by another account")
        }
        updateFields.username = username.toLowerCase()
    }
    if (email) {
        const emailExists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user._id } })
        if (emailExists) {
            throw new ApiError(409, "Email is already in use by another account")
        }
        updateFields.email = email.toLowerCase()
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateFields },
        { new: true }
    ).select("-password -refreshToken")

    return res.status(200).json(new ApiResponse(200, {user}, "user profile updated successfully"));
})

const updateUserAvatar= asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar has not been uploaded")
    }

    const avatar = await uploadCloudinary(avatarLocalPath)
    if(!avatar || !avatar.url){
        throw new ApiError(400, "error while uploading avatar");
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                avatar : avatar.url
            }
        },
        {new : true}
    ).select("-password")

    // delete old image from cloudinary
    if(req.user?.avatar){
        try{
            const publicId = req.user.avatar.split("/").pop().split(".")[0];
            await deleteFromCloudinary(publicId);
        }
        catch(error){
            console.error("Error deleting old avatar:", error);
        }
    }
    
    return res.status(200).json(new ApiResponse(200, {user}, "avatar uploaded successfully"))
})

const updateUserCoverImage= asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path;
    if(!coverImageLocalPath) {
        throw new ApiError(400, "coverImage has not been uploaded")
    }

    const coverImage = await uploadCloudinary(coverImageLocalPath)
    if(!coverImage || !coverImage.url){
        throw new ApiError(400, "error while uploading coverImage");
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                coverImage : coverImage.url
            }
        },
        {new : true}
    ).select("-password")

    //delete saved cover image on cloudinary
    try{
        if(req.user.coverImage){
            const publicId = req.user.coverImage.split("/").pop().split(".")[0];
            await deleteFromCloudinary(publicId);
        }
    } catch(error){
        console.error("Error deleting old cover image:", error);
    }

    return res.status(200).json(new ApiResponse(200, {user}, "coverImage uploaded successfully"))
})

const getUserChannelProfile = asyncHandler (async(req,res) => {
    const {username} = req.params;

    if(!username?.trim() || username === "undefined" || username === "null"){
        throw new ApiError(400, "username is missing or invalid");
    }

    const cleanUsername = username.trim().replace(/^@/, "");
    const currentUserId = req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null;
    const matchFilter = isValidObjectId(cleanUsername)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(cleanUsername) }, { username: cleanUsername.toLowerCase() }] }
        : { username: cleanUsername.toLowerCase() };

    const channel = await User.aggregate([
        {
            $match: matchFilter
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribeTo"
            }
        },
        {
            $addFields:{
                subscribersCount :{
                    $size: "$subscribers"
                },
                subscribeToCount: {
                    $size: "$subscribeTo"
                },
                isSubscribed: {
                    $cond: {
                        if: currentUserId 
                            ? { $in: [ currentUserId, "$subscribers.subscriber" ] } 
                            : false, // If logged out, immediately evaluate to false without confusing MongoDB
                        then : true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                subscribeToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "channel does not exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "user channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate({
        path: "watchHistory",
        populate: {
            path: "owner",
            select: "username fullName avatar"
        }
    })

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    const history = (user.watchHistory || []).filter(Boolean).reverse()

    return res
        .status(200)
        .json(new ApiResponse(200, history, "Watch history fetched successfully"))
})

const clearWatchHistory = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: { watchHistory: [] }
    });
    return res.status(200).json(new ApiResponse(200, [], "Watch history cleared successfully"));
});

export {
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    generateAccessAndRefreshToken, 
    changePassword, 
    forgotPassword, 
    getCurrentUser, 
    updateUserProfile, 
    updateUserAvatar, 
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    clearWatchHistory
};