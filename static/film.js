const filmId = 1;

const stars = document.querySelectorAll('.star');
const starsContainer = document.getElementById('stars');
const ratingNumber = document.getElementById('ratingNumber');

let averageRating = 0;
let userRating = null;
let isLoggedIn = false;

async function loadFilm() {

    const res = await fetch(`/api/film?filmId=${filmId}`);
    const film = await res.json();

    document.getElementById('title').textContent = film.title;
    document.getElementById('poster').src = film.poster;
    document.getElementById('year').textContent = film.year;
    document.getElementById('country').textContent = film.country;
    document.getElementById('duration').textContent = film.duration + " min";
    document.getElementById('genre').textContent = film.genres.join(", ");
    document.getElementById('actors').textContent = film.actors.join(", ");
    document.getElementById('director').textContent = film.directors.join(", ");
    document.getElementById('description').textContent = film.description;

    averageRating = Number(film.rating.average).toFixed(1);
    userRating = film.rating.user;

    ratingNumber.textContent = averageRating;

    if (userRating !== null) {
        isLoggedIn = true;
        paintUser(userRating);
    } else {
        paintAverage();
    }
}

function clearStars() {
    stars.forEach(s => s.classList.remove('yellow','white','selected'));
}

function paintAverage() {
    clearStars();
    let rounded = Math.round(averageRating);
    stars.forEach(s => {
        if (Number(s.dataset.value) <= rounded) {
            s.classList.add('yellow');
        }
    });
}

function paintUser(value) {
    clearStars();
    stars.forEach(s => {
        if (Number(s.dataset.value) <= value) {
            s.classList.add('selected');
        }
    });
}

stars.forEach(star => {

    star.addEventListener('mouseenter', () => {
        clearStars();
        let value = Number(star.dataset.value);

        stars.forEach(s => {
            if (Number(s.dataset.value) <= value) {
                s.classList.add('white');
            }
        });
    });

    star.addEventListener('click', async () => {
        if (!isLoggedIn) return;

        userRating = Number(star.dataset.value);
        paintUser(userRating);

        await fetch('/api/setRating', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
                filmId: filmId,
                rating: userRating
            })
        });
    });
});

starsContainer.addEventListener('mouseleave', () => {
    if (userRating !== null) {
        paintUser(userRating);
    } else {
        paintAverage();
    }
});

loadFilm();