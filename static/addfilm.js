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

    const formData = new FormData();

    formData.append('title', document.getElementById('title').value);
    formData.append('description', document.getElementById('description').value);
    formData.append('year', Number(document.getElementById('year').value));
    formData.append('duration', Number(document.getElementById('duration').value));
    formData.append('country', document.getElementById('country').value);
    formData.append('poster', document.getElementById('poster').files[0]);
    formData.append('video', document.getElementById('video').files[0]);
    formData.append('genres', JSON.stringify(selectedGenres));
    formData.append('actors', JSON.stringify(actorNames));
    formData.append('directors', JSON.stringify(directorNames));

    try {
        const res = await fetch('/api/addFilm', {
            method: 'POST',
            body: formData
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
