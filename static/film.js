const socket = io({
    auth: {
        cookie: document.cookie
    }
});

const params = new URLSearchParams(window.location.search);
const filmId = params.get('filmId');

const stars = document.querySelectorAll('.star');
const starsContainer = document.getElementById('stars');
const ratingNumber = document.getElementById('ratingNumber');
const ratingQuantity = document.getElementById('ratingQuantity');

let averageRating = 0;
let userRating = null;
let isLoggedIn = false;

const commentsList = document.getElementById('commentsList');
const commentForm = document.getElementById('commentForm');
const commentInput = document.getElementById('commentInput');

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
    let loginOrLeave = document.getElementById('loginOrLeave');

    if(film.user_id !== null){
        isLoggedIn = true;
        loginOrLeave.classList.add('btn-outline-danger')
        loginOrLeave.classList.remove('btn-outline-light')
        loginOrLeave.textContent = 'Log out'
        loginOrLeave.addEventListener('click', function(e){
            e.preventDefault();
            document.cookie = 'token=; Max-Age=0';
            window.location.assign(`/login`);
            loginOrLeave.classList.remove('btn-outline-danger')
            loginOrLeave.classList.add('btn-outline-light')  
        })
    }

    averageRating = Number(film.rating.average).toFixed(1);
    userRating = film.rating.user;

    ratingNumber.textContent = averageRating;
    ratingQuantity.textContent = `(${film.rating.quantity})`

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
        if (!isLoggedIn) {
            alert("Please log in first")
            return
        };

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
loadComments()


commentForm.addEventListener('submit', async function(e){
    e.preventDefault();
    if (!isLoggedIn) {
        alert("Please log in first");
        return;
    }

    if(!commentInput.value) return;
    socket.emit('new_message', commentInput.value, filmId)
    commentInput.value = '';
    await loadComments();
})


async function loadComments() {
    const res = await fetch(`/api/comments?filmId=${filmId}`);
    const comments = await res.json();
    commentsList.innerHTML = "";

    if(comments.comments.length === 0){
        commentsList.innerHTML = "No comments yet"
    }else{
        comments.comments.forEach(comment => {
            const div = document.createElement('div');
            div.className = 'comment-card';

            div.innerHTML = `
                <div class="comment-author">${comment.login}</div>
                <div class="comment-date">${new Date(comment.created_at).toLocaleString()}</div>
                <div class="comment-text">${comment.content}</div>
            `;

            commentsList.appendChild(div);
        });
    }
}