// ==UserScript==
// @name        Link MyAnimeList to AniList
// @namespace   https://greasyfork.org/en/users/1195345-necodes
// @author      NECOdes
// @description Adds Anilist anime/manga link to their MyAnimeList page
// @version     0.1.2
// @match		https://myanimelist.net/anime/*
// @match       https://myanimelist.net/manga/*
// @grant		GM_xmlhttpRequest
// @connect		graphql.anilist.co
// @license     MIT
// ==/UserScript==

'use strict';

(async function() {
    // Don't run on non-anime/manga pages
	const match = window.location.pathname.match(/\/(anime|manga)\/(\d+)/);
	if (!match) return;

    // Get the type of the page and its ID
	const type = match[1] === 'anime' ? 'ANIME' : 'MANGA';
	const malId = parseInt(match[2], 10);

    // Fetch favicon from 4get.kat.tf
	const favicon = (siteUrl) => `https://4get.ca/favicon?s=${encodeURIComponent(siteUrl)}`;

    // Prepare Anilist's Graphql query
	const query = `
		query ($malId: Int, $type: MediaType) {
			Media(idMal: $malId, type: $type) {
				siteUrl
			}
		}
	`;
	const variables = { malId, type };

	// GM_xmlhttpRequest Promise to use with async/await
	const gmFetch = (options) => {
		return new Promise((resolve, reject) => {
			GM_xmlhttpRequest({
				...options,
				onload: (response) => {
					if (response.status >= 200 && response.status < 3000) {
						resolve(response);
					} else {
						reject(new Error(`Request failed with status ${response.status}: ${response.statusText}`));
					}
				},
				onerror: (error) => reject(error),
				ontimeout: () => reject(new Error('Request timed out.')),
			});
		});
	};

	try {
        // Fetch the anime/manga info
		const response = await gmFetch({
			method: 'POST',
			url: 'https://graphql.anilist.co',
			headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
			data: JSON.stringify({ query, variables }),
		})

        // Get anime/manga url
		const json = JSON.parse(response.responseText);
		const anilistUrl = json?.data?.Media?.siteUrl;

		// Creates and appends the Anilist link to the external_links container
		const createAnilistLink = (panel) => {

			let container = document.querySelector('.external_links');

            // create the container element if the manga/anime doesnt have it
            if (!container) {
                const header = document.createElement('h2');
                container = document.createElement('div');

                container.classList.add('external_links');
                header.textContent = "Available at"

                panel.append(header);
                panel.append(container);
            }

			// prevents duplicate links
			if (container.querySelector('.anilist-button')) {
				return true;
			}
			const firstChild = container.children[0];

            // Create Anilist <a> tag element
			const newLink = document.createElement('a');
			if (anilistUrl) {
				newLink.href = anilistUrl;
				newLink.target = '_blank';
			} else {
				newLink.href = "javascript:void(0)";
			}
			newLink.classList.add('link', 'ga-click', 'anilist-button');
			newLink.style.display = 'flex';
			newLink.style.fontFamily = 'inherit';
			newLink.style.fontSize = 'inherit';
			newLink.style.padding = '4px';
			newLink.style.margin = '0';
            newLink.style.webkitBoxDirection = 'normal';
            newLink.style.webkitBoxOrient = 'horizontal';

            // Create <img> tag for the Anilist link
			const newImg = document.createElement('img');
			newImg.src = favicon("https://anilist.co");
			newImg.classList.add('link_icon');
			newImg.alt = 'anilist-icon';
            newImg.style.height = '20px';

            // Create caption <div> for the Anilist link
			const captionDiv = document.createElement('div');
			captionDiv.textContent = 'Anilist';
			captionDiv.classList.add('caption');
            captionDiv.style.display = 'inline-block';
            captionDiv.style.height = '20px';
            captionDiv.style.lineHeight = '20px';
            captionDiv.style.marginLeft = '6px';
            captionDiv.style.overflow = 'hidden';

            // if entry doesnt have an anilist page
            if (!anilistUrl) {
			    console.warn('Anilist URL not found for this entry.')

                newLink.style.cursor = "not-allowed";

                newLink.style.textDecoration = "none";
                newLink.style.color = "gray";
                newLink.setAttribute('title', "This entry doesn't have an Anilist page or isn't linked yet.");
            }

            // Append both img and caption to Anilist link as children
			newLink.appendChild(newImg);
			newLink.appendChild(captionDiv);

            // Insert the Anilist link element before the first child in .external_links
			container.insertBefore(newLink, firstChild)
			return true;
		}

        // Waits for .leftside to appear in the DOM
		const panel = document.querySelector('.leftside') ?? await new Promise(resolve => {
			const observer = new MutationObserver((_, obs) => {
				const el = document.querySelector('.leftside');
				if (el) { obs.disconnect(); resolve(el); }
			});
			observer.observe(document.body, { childList: true, subtree: true });
		});
		createAnilistLink(panel);

	} catch (err) {
		console.error('Anilist API request failed: ', err);
	}
})();