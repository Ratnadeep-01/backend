import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    const comments = await Comment.find({ video: videoId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate("owner", "username fullName avatar")

    const totalComments = await Comment.countDocuments({ video: videoId })

    const commentsWithLikes = await Promise.all(
        comments.map(async (comment) => {
            const likesCount = await Like.countDocuments({ comment: comment._id })
            const isLiked = req.user
                ? !!(await Like.findOne({ comment: comment._id, likedBy: req.user._id }))
                : false
            const commentData = comment.toObject()
            commentData.likesCount = likesCount
            commentData.isLiked = isLiked
            return commentData
        })
    )

    return res.status(200).json(new ApiResponse(200, { docs: commentsWithLikes, totalDocs: totalComments }, "Comments fetched successfully"))
})

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { content, text } = req.body
    const commentContent = content || text

    if (!commentContent?.trim()) {
        throw new ApiError(400, "Comment content is required")
    }

    const comment = await Comment.create({
        video: videoId,
        owner: req.user._id,
        content: commentContent
    })

    const populatedComment = await Comment.findById(comment._id).populate("owner", "username fullName avatar")

    return res.status(201).json(new ApiResponse(201, populatedComment, "Comment added successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const { content, text } = req.body
    const commentContent = content || text

    if (!commentContent?.trim()) {
        throw new ApiError(400, "Comment content is required")
    }

    const comment = await Comment.findOneAndUpdate(
        { _id: commentId, owner: req.user._id },
        { $set: { content: commentContent } },
        { new: true }
    ).populate("owner", "username fullName avatar")

    if (!comment) {
        throw new ApiError(404, "Comment not found or unauthorized")
    }

    return res.status(200).json(new ApiResponse(200, comment, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    const comment = await Comment.findOneAndDelete({ _id: commentId, owner: req.user._id })
    if (!comment) {
        throw new ApiError(404, "Comment not found or unauthorized")
    }

    return res.status(200).json(new ApiResponse(200, null, "Comment deleted successfully"))
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}