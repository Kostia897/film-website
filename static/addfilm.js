const form = document.getElementById('filmForm');
const statusText = document.getElementById('status');

async function loadGenres() {
    const res = await fetch('/api/genres');
    const genres = await res.json();

    const select = document.getElementById('genres');

    genres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre.genre_id;
        option.textContent = genre.name;
        select.appendChild(option);
    });
}

loadGenres();

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedGenres = Array.from(
        document.getElementById('genres').selectedOptions
    ).map(option => Number(option.value));

    const actorsInput = document.getElementById('actors').value;
    const directorsInput = document.getElementById('directors').value;

    const actorNames = actorsInput.split(',').map(actor => actor.trim()).filter(actor => actor);
    const directorNames = directorsInput.split(',').map(director => director.trim()).filter(director => director);

    const film = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        year: Number(document.getElementById('year').value),
        duration: Number(document.getElementById('duration').value),
        country: document.getElementById('country').value,
        poster: document.getElementById('poster').value,
        genres: selectedGenres,
        actors: actorNames,
        directors: directorNames
    };

    try {
        const res = await fetch('/api/addFilm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(film)
        });

        const data = await res.json();

        if (res.ok) {
            statusText.textContent = "Film added successfully!";
            form.reset();
        } else {
            statusText.textContent = data.message || "Error adding film";
        }

    } catch (err) {
        statusText.textContent = "Server error";
        console.error(err);
    }
});
