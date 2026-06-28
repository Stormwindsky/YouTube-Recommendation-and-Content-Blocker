// ==UserScript==
// @name         YouTube Recommendation & Content Blocker
// @namespace    https://github.com/Stormwindsky/YouTube-Recommendation-and-Content-Blocker
// @version      1.0
// @description  Removes specific YouTubers from recommendations and automatically redirects away if you accidentally visit their videos or channels.
// @author       Stormwindsky
// @match        https://www.youtube.com/*
// @grant        none
// @run-at       document-start
// @license      CC0 1.0 Universal
// ==/UserScript==

(function() {
    'use strict';

    // --- CONFIGURATION ---
    // Easily add or remove channels here.
    // You can use the @username, the channel ID, or words that appear in their channel links.
    const BLOCKED_TARGETS = [
        '@RickAstleyYT',
        'UCuAXFkgsw1L7xaCfnd5JJOw'
    ];
    // ---------------------

    // Selectors for YouTube video blocks/containers across the site
    const VIDEO_CONTAINERS = [
        'ytd-rich-item-renderer',      // Homepage videos
        'ytd-video-renderer',          // Search results
        'ytd-compact-video-renderer',  // Sidebar / Watch next recommendations
        'ytd-grid-video-renderer'      // Grid layouts (tabs, etc.)
    ].join(',');

    // Function to handle redirection if you are on a blocked channel or video
    function redirectIfBlocked() {
        const currentUrl = window.location.href;

        // 1. Check if we are currently on a blocked channel page
        const isOnBlockedChannel = BLOCKED_TARGETS.some(target => currentUrl.includes(target));

        // 2. Check if we are watching a video from a blocked channel
        let isOnBlockedVideo = false;
        const channelLinksInWatchPage = document.querySelectorAll('ytd-watch-metadata a[href*="/@"], ytd-watch-metadata a[href*="/channel/"]');

        channelLinksInWatchPage.forEach(link => {
            const href = link.getAttribute('href');
            if (href && BLOCKED_TARGETS.some(target => href.includes(target))) {
                isOnBlockedVideo = true;
            }
        });

        // If blocked, go back in history, or fallback to YouTube home page if there's no history
        if (isOnBlockedChannel || isOnBlockedVideo) {
            if (document.referrer && document.referrer.includes('youtube.com')) {
                window.history.back();
            } else {
                window.location.href = 'https://www.youtube.com/';
            }
        }
    }

    // Function to hide recommendations from the feed
    function blockVideos() {
        const channelLinks = document.querySelectorAll('a[href*="/@"], a[href*="/channel/"], a[href*="/c/"]');

        channelLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;

            const shouldBlock = BLOCKED_TARGETS.some(target => href.includes(target));

            if (shouldBlock) {
                const videoCard = link.closest(VIDEO_CONTAINERS);
                if (videoCard && videoCard.style.display !== 'none') {
                    videoCard.style.display = 'none';
                }
            }
        });
    }

    // Run the script continuously using a MutationObserver to catch dynamic page changes
    const observer = new MutationObserver(() => {
        blockVideos();
        redirectIfBlocked();
    });

    // Start watching the page for changes once the body is ready
    const initInterval = setInterval(() => {
        if (document.body) {
            clearInterval(initInterval);
            observer.observe(document.body, { childList: true, subtree: true });
            blockVideos();
            redirectIfBlocked();
        }
    }, 100);

    // Also monitor URL changes directly (YouTube is a Single Page Application and doesn't always trigger a full reload)
    window.addEventListener('yt-navigate-start', () => {
        // Delayed check to allow the new page metadata to load
        setTimeout(redirectIfBlocked, 500);
    });
})();
