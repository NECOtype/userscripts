// ==UserScript==
// @name        Link MyAnimeList to AniList
// @namespace   https://greasyfork.org/en/users/1195345-necodes
// @author      NECOdes
// @description Adds Anilist anime/manga link to their MyAnimeList page
// @version     0.1.0
// @match		https://myanimelist.net/anime/*
// @match       https://myanimelist.net/manga/*
// @grant		GM_xmlhttpRequest
// @connect		graphql.anilist.co
// @license     MIT
// ==/UserScript==

'use strict';

(async function() {
	const match = window.location.pathname.match(/\/(anime|manga)\/(\d+)/);
	if (!match) return;

	const type = match[1] === 'anime' ? 'ANIME' : 'MANGA';
	const malId = parseInt(match[2], 10);

	const favicon = (siteUrl) => `https://4get.ca/favicon?s=${encodeURIComponent(siteUrl)}`;

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
		const response = await gmFetch({
			method: 'POST',
			url: 'https://graphql.anilist.co',
			headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
			data: JSON.stringify({ query, variables }),
		})

		const json = JSON.parse(response.responseText);
		const anilistUrl = json?.data?.Media?.siteUrl;
		if (!anilistUrl) {
			console.warn('Anilist URL not found for this entry.')
			return;
		};

		// Creates and appends the Anilist link to the external_links container
		const createAnilistLink = (container) => {
			// prevents duplicate links
			if (container.querySelector('.anilist-button')) {
				return true;
			}
			const firstChild = container.children[0];

			const newLink = document.createElement('a');
			newLink.href = anilistUrl;
			newLink.target = '_blank';
			newLink.classList.add('link', 'ga-click', 'anilist-button');
			newLink.style.display = 'flex';
			newLink.style.fontFamily = 'inherit';
			newLink.style.fontSize = 'inherit';
			newLink.style.padding = '4px';
			newLink.style.margin = '0';
			newLink.style.textDecoration = 'none';
            newLink.style.webkitBoxDirection = 'normal';
            newLink.style.webkitBoxOrient = 'horizontal';
            newLink.addEventListener('mouseenter', () => {
                newLink.style.textDecoration = 'underline';
            });
            newLink.addEventListener('mouseleave', () => {
                newLink.style.textDecoration = 'none';
            });

			const newImg = document.createElement('img');
			newImg.src = favicon("https://anilist.co");
			newImg.classList.add('link_icon');
			newImg.alt = 'anilist-icon';
            newImg.style.height = '20px';

			const captionDiv = document.createElement('div');
			captionDiv.textContent = 'Anilist';
			captionDiv.classList.add('caption');
            captionDiv.style.display = 'inline-block';
            captionDiv.style.height = '20px';
            captionDiv.style.lineHeight = '20px';
            captionDiv.style.marginLeft = '6px';
            captionDiv.style.overflow = 'hidden'

			newLink.appendChild(newImg);
			newLink.appendChild(captionDiv);

			container.insertBefore(newLink, firstChild)
			return true;
		}

		const observer = new MutationObserver((mutations, obs) => {
			const container = document.querySelector('.external_links');

			if (container) {
				if (createAnilistLink(container)) {
					obs.disconnect();
				}
			}
		})

		observer.observe(document.body, { childList: true, subtree: true });
	} catch (err) {
		console.error('Anilist API request failed: ', err);
	}
})();