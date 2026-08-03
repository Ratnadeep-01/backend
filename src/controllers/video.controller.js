import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { Like } from "../models/like.model.js"
import { Comment } from "../models/comment.model.js"
import { Playlist } from "../models/playlist.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    const filter = { isPublished: true }

    if (userId) {
        const idList = typeof userId === "string" ? userId.split(",") : Array.isArray(userId) ? userId : [userId]
        const validObjectIds = idList.map(id => id.trim()).filter(id => isValidObjectId(id))
        if (validObjectIds.length > 0) {
            filter.owner = { $in: validObjectIds }
        } else if (typeof userId === "string" && !userId.includes(",")) {
            const userObj = await User.findOne({ username: userId.toLowerCase() })
            if (userObj) {
                filter.owner = userObj._id
            }
        }
    }

    if (query) {
        filter.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ]
    }

    const videos = await Video.find(filter)
        .sort({ [sortBy || "createdAt"]: sortType === "asc" ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate("owner", "username fullName avatar")

    const videosWithLikes = await Promise.all(
        videos.map(async (vid) => {
            const likesCount = await Like.countDocuments({ video: vid._id })
            const vidObj = vid.toObject()
            vidObj.likesCount = likesCount
            return vidObj
        })
    )

    return res.status(200).json(new ApiResponse(200, { docs: videosWithLikes, totalDocs: videosWithLikes.length }, "Videos fetched successfully"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required")
    }

    const videoLocalPath = req.files?.videoFile?.[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path

    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is required")
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail image is required")
    }

    const videoUploaded = await uploadCloudinary(videoLocalPath)
    const thumbnailUploaded = await uploadCloudinary(thumbnailLocalPath)

    if (!videoUploaded) {
        throw new ApiError(400, "Failed to upload video to Cloudinary")
    }

    if (!thumbnailUploaded) {
        throw new ApiError(400, "Failed to upload thumbnail to Cloudinary")
    }

    const video = await Video.create({
        title,
        description,
        videoFile: videoUploaded.url,
        thumbnail: thumbnailUploaded.url,
        duration: videoUploaded.duration || 0,
        owner: req.user._id,
        isPublished: true
    })

    const createdVideo = await Video.findById(video._id).populate("owner", "username fullName avatar")

    return res.status(201).json(new ApiResponse(201, createdVideo, "Video published successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    // Increment views atomically by 1
    const video = await Video.findByIdAndUpdate(
        videoId,
        { $inc: { views: 1 } },
        { new: true }
    ).populate("owner", "username fullName avatar")

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    // Update user's watch history: pull existing entry then push to end (most recent)
    if (req.user?._id) {
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { watchHistory: video._id }
        })
        await User.findByIdAndUpdate(req.user._id, {
            $push: { watchHistory: video._id }
        })
    }

    // Attach real likes count and isLiked status
    const videoObjectId = new mongoose.Types.ObjectId(videoId)
    const likesCount = await Like.countDocuments({ video: videoObjectId })
    const isLiked = req.user
        ? !!(await Like.findOne({ video: videoObjectId, likedBy: req.user._id }))
        : false

    // Attach owner subscribers count and isSubscribed status
    const ownerId = video.owner?._id || video.owner
    const subscribersCount = ownerId ? await Subscription.countDocuments({ channel: ownerId }) : 0
    const isSubscribed = (req.user && ownerId)
        ? !!(await Subscription.findOne({ channel: ownerId, subscriber: req.user._id }))
        : false

    const videoData = video.toObject()
    videoData.likesCount = likesCount
    videoData.isLiked = isLiked
    if (videoData.owner && typeof videoData.owner === "object") {
        videoData.owner.subscribersCount = subscribersCount
        videoData.owner.isSubscribed = isSubscribed
    }

    return res.status(200).json(new ApiResponse(200, videoData, "Video fetched successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body

    const thumbnailLocalPath = req.file?.path
    let thumbnailUploaded

    if (thumbnailLocalPath) {
        thumbnailUploaded = await uploadCloudinary(thumbnailLocalPath)
    }

    const updateFields = {}
    if (title) updateFields.title = title
    if (description) updateFields.description = description
    if (thumbnailUploaded?.url) updateFields.thumbnail = thumbnailUploaded.url

    const video = await Video.findOneAndUpdate(
        { _id: videoId, owner: req.user._id },
        { $set: updateFields },
        { new: true }
    )

    if (!video) {
        throw new ApiError(404, "Video not found or you are not authorized to edit this video")
    }

    return res.status(200).json(new ApiResponse(200, video, "Video updated successfully"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findOneAndDelete({ _id: videoId, owner: req.user._id })
    if (!video) {
        throw new ApiError(404, "Video not found or you are not authorized to delete this video")
    }

    // Clean up Cloudinary assets
    if (video.videoFile) {
        const publicId = video.videoFile.split("/").pop().split(".")[0]
        await deleteFromCloudinary(publicId, "video")
    }
    if (video.thumbnail) {
        const publicId = video.thumbnail.split("/").pop().split(".")[0]
        await deleteFromCloudinary(publicId, "image")
    }

    // Clean up associated comments, likes, and playlists
    await Comment.deleteMany({ video: videoId })
    await Like.deleteMany({ video: videoId })
    await Playlist.updateMany({}, { $pull: { videos: videoId } })

    return res.status(200).json(new ApiResponse(200, null, "Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized to toggle publish status")
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: { isPublished: !video.isPublished } },
        { new: true }
    )

    return res.status(200).json(new ApiResponse(200, updatedVideo, "Publish status toggled successfully"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}