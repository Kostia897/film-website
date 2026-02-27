const form = document.getElementById('filmForm');
const statusText = document.getElementById('status');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const film = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        year: Number(document.getElementById('year').value),
        duration: Number(document.getElementById('duration').value),
        country: document.getElementById('country').value,
        poster: document.getElementById('poster').value
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
