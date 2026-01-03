// TEMPORARY TOKEN (Expires in 1 hour)
const TEMP_TOKEN = 'BQCKbjcYCr5Bimo1jJZO_Hy_ILEe-0w9X1xkhTDgB5tzITP4T96jA0TkHQvWFmE78OJy6Fi0PxLfeUWLQnHNZDKtFPqTZmRmSzumYG2v7a8DlaoHiUILdbEgZVDbvGoGrHaZ-F1tEEQc-u2evvAZy3xDhT2gVK8WmzkyAT6dgy3ea7O0geyyTIaxjgVF5iVuSKh1TR1XkZ-0AVLkLkY6YYglYyZVhnRY2mcS1TlD9zVh5DKWaspATJqQNLwjcbDVqmBUfzp2Sx2Kzy3CKVx_h19fzlT7hPi1czst1y2QPu154ApXCTpbjOzg6mqkAyB2eV7EEz5X';

const NOW_PLAYING_ENDPOINT = `https://api.spotify.com/v1/me/player/currently-playing`;

export async function getNowPlaying() {
    return fetch(NOW_PLAYING_ENDPOINT, {
        headers: {
            Authorization: `Bearer ${TEMP_TOKEN}`,
        },
    });
}