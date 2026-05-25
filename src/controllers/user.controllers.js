import {asyncHandler} from '../utils/assyncHandler.js';
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import {uploadCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler( async(req, res) => {
    const {username, email, password, fullName} = req.body;
    if([fullName, username, password, email].some((fields) => fields?.trim() === "")){
        throw new ApiError(400, "all fields are required");
    }

    const userExist = User.findOne({
        $or : [{email}, {username}]
    })

    if(userExist){
        throw new ApiError(409, "user already exits with this username or email");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    
    if(!avatarLocalPath){
        throw new ApiError(405, "avatar image is not uploaded")
    }
    
    const avatar = await uploadCloudinary(avatarLocalPath)
    const coverImage = await uploadCloudinary(coverImageLocalPath)
    
    if(!avatar){
        throw new ApiError(405, "avatar image is not uploaded")
    }

    const user = await User.create({
        fullName,
        email,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        password,
        username: username.toLowerCase()
    })

    const createdUser =  await user.findById(user._id).select(
        "-password -refershToken"
    )

    if(!createdUser){
        throw new ApiError(500, "something went wrong while registeration")
    }

    return res.status(201)(
        new ApiResponse(200, createdUser, "registeration successful")
    )
    
})

export {registerUser};