const attachments = karma.config.attachments;
const videoAsset = attachments.videoAsset;
const video = document.querySelector("video");
const debugProgress = document.getElementById("debug-progress");

function getVideoAssetFilename() {
    const url = new URL(video.src);
    return url.pathname.split("/").pop();
}

function removeVideoEvents() {
    video.onerror = null;
    video.onended = null;
    video.ontimeupdate = null;
}

function getPlaybackQualityWhenDebugEnded() {
    const detail = video.getVideoPlaybackQuality();
    const totalVideoFrames = detail.totalVideoFrames;
    const droppedVideoFrames = detail.droppedVideoFrames;
    const droppedVideoFramesPercentage = (droppedVideoFrames / totalVideoFrames) * 100;

    return {
        totalVideoFrames,
        droppedVideoFrames,
        droppedVideoFramesPercentage,
    };
}

function debugCompleteCallback() {
    const filename = getVideoAssetFilename();
    const playbackQuality = getPlaybackQualityWhenDebugEnded();

    removeVideoEvents();
    setTimeout(() => {
        karma["complete"](
            Object.assign(
                {
                    error: video.error,
                    filename: filename,
                    userAgent: navigator.userAgent,
                },
                videoAsset,
                playbackQuality,
            ),
        );
    }, 0);
}

video.ontimeupdate = (e) => {
    const debugEndedTime = attachments.debugEndedTime || Infinity;

    if (video.currentTime > debugEndedTime) {
        debugCompleteCallback();
    }
};

video.onerror = debugCompleteCallback;
video.onended = debugCompleteCallback;
video.src = videoAsset.url;

debugProgress.textContent = attachments.debugProgressContent;
