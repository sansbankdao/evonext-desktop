// src/stores/posts/actions/index.ts

// src/stores/posts/actions/index.ts (fixed)
import {
    fetchPostsAction,
    fetchUserPostsAction,
    fetchMorePostsAction
} from './fetch'

import {
    createNewPostAction,
    updateExistingPostAction,
    deletePostByIdAction
} from './createUpdate'

import {
    likePostByIdAction,
    unlikePostByIdAction,
    bookmarkPostByIdAction,
    unbookmarkPostByIdAction
} from './interactions'

import {
    refreshPostStatsAction,
    clearAction,
    updatePostAuthorAction,
    upsertPostAction,
    initializeLikedPostsAction
} from './utilities'

export default {
    // Fetch actions
    fetchPosts: fetchPostsAction,
    fetchUserPosts: fetchUserPostsAction,
    fetchMorePosts: fetchMorePostsAction,

    // Create/Update actions
    createNewPost: createNewPostAction,
    updateExistingPost: updateExistingPostAction,
    deletePostById: deletePostByIdAction,

    // Interaction actions
    likePostById: likePostByIdAction,
    unlikePostById: unlikePostByIdAction,
    bookmarkPostById: bookmarkPostByIdAction,
    unbookmarkPostById: unbookmarkPostByIdAction,

    // Utility actions
    refreshPostStats: refreshPostStatsAction,
    clear: clearAction,
    updatePostAuthor: updatePostAuthorAction,
    upsertPost: upsertPostAction,
    initializeLikedPosts: initializeLikedPostsAction
}
