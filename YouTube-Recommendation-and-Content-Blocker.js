// ==UserScript==
// @name         YouTube Recommendation & Content Blocker
// @namespace    https://github.com/Stormwindsky
// @version      1.1
// @description  Removes specific YouTubers. Manage list via the Userscript extension menu command.
// @author       Stormwindsky
// @match        https://www.youtube.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// @license      CC0 1.0 Universal
// ==/UserScript==

(function() {
    'use strict';

    // --- INITIAL CONFIGURATION ---
    const DEFAULT_BLOCKED = [
        '@RickAstleyYT',
        'UCuAXFkgsw1L7xaCfnd5JJOw'
    ];

    // Load the list from the extension's secure storage
    function getBlockedTargets() {
        let stored = GM_getValue('yt_blocked_channels', null);
        if (!stored) {
            GM_setValue('yt_blocked_channels', JSON.stringify(DEFAULT_BLOCKED));
            return DEFAULT_BLOCKED;
        }
        return JSON.parse(stored);
    }

    // YouTube selectors to hide videos
    const VIDEO_CONTAINERS = [
        'ytd-rich-item-renderer',      // Homepage
        'ytd-video-renderer',          // Search
        'ytd-compact-video-renderer',  // Sidebar
        'ytd-grid-video-renderer'      // Grids
    ].join(',');

    // Redirect if on a blocked channel or video
    function redirectIfBlocked() {
        const BLOCKED_TARGETS = getBlockedTargets();
        const currentUrl = window.location.href;
        const isOnBlockedChannel = BLOCKED_TARGETS.some(target => currentUrl.includes(target));

        let isOnBlockedVideo = false;
        const channelLinksInWatchPage = document.querySelectorAll('ytd-watch-metadata a[href*="/@"], ytd-watch-metadata a[href*="/channel/"]');

        channelLinksInWatchPage.forEach(link => {
            const href = link.getAttribute('href');
            if (href && BLOCKED_TARGETS.some(target => href.includes(target))) {
                isOnBlockedVideo = true;
            }
        });

        if (isOnBlockedChannel || isOnBlockedVideo) {
            if (document.referrer && document.referrer.includes('youtube.com')) {
                window.history.back();
            } else {
                window.location.href = 'https://www.youtube.com/';
            }
        }
    }

    // Hide videos from blocked channels
    function blockVideos() {
        const BLOCKED_TARGETS = getBlockedTargets();
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

    // --- REGISTER COMMANDS IN THE EXTENSION MENU ---
    GM_registerMenuCommand("➕ Add a block", () => {
        let BLOCKED_TARGETS = getBlockedTargets();
        let val = prompt("Enter the @username or channel ID to block:");
        if (val) {
            val = val.trim();
            if (val && !BLOCKED_TARGETS.includes(val)) {
                BLOCKED_TARGETS.push(val);
                GM_setValue('yt_blocked_channels', JSON.stringify(BLOCKED_TARGETS));
                alert(val + " has been added to the list.");
                blockVideos();
                redirectIfBlocked();
            }
        }
    });

    GM_registerMenuCommand("❌ Remove a block", () => {
        let BLOCKED_TARGETS = getBlockedTargets();
        if (BLOCKED_TARGETS.length === 0) {
            alert("No channels in the blocklist.");
            return;
        }

        let message = "Select the number of the block to remove:\n\n";
        BLOCKED_TARGETS.forEach((target, index) => {
            message += (index + 1) + ". " + target + "\n";
        });

        let choice = prompt(message);
        if (choice) {
            let idx = parseInt(choice.trim(), 10) - 1;
            if (!isNaN(idx) && idx >= 0 && idx < BLOCKED_TARGETS.length) {
                let removed = BLOCKED_TARGETS.splice(idx, 1);
                GM_setValue('yt_blocked_channels', JSON.stringify(BLOCKED_TARGETS));
                alert(removed[0] + " has been removed from the list. Reloading page...");
                window.location.reload();
            } else {
                alert("Invalid number.");
            }
        }
    });

    GM_registerMenuCommand("📋 View list", () => {
        let BLOCKED_TARGETS = getBlockedTargets();
        if (BLOCKED_TARGETS.length === 0) {
            alert("The list is empty.");
        } else {
            alert("Currently blocked channels:\n\n" + BLOCKED_TARGETS.join("\n"));
        }
    });

    // --- VIDEO MONITORING AND UPDATES ---
    setInterval(() => {
        blockVideos();
        redirectIfBlocked();
    }, 500);

    const observer = new MutationObserver(() => {
        blockVideos();
        redirectIfBlocked();
    });

    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }
})();
