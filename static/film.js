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


let currentPage = 1;
let totalPages = 1;
const commentsPerPage = 5;

async function loadComments(page = 1) {
    currentPage = page;
    let offset = (page - 1) * commentsPerPage;

    const res = await fetch(`/api/comments?filmId=${filmId}&offset=${offset}&limit=${commentsPerPage}`);
    const data = await res.json();
    commentsList.innerHTML = "";

    const comments = data.comments;
    totalPages = Math.ceil(Number(data.totalCount) / commentsPerPage);

    if(comments.length === 0){
        commentsList.innerHTML = "No comments yet"
    }else{
        comments.forEach(comment => {
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

    renderPagination();
}


function renderPagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = "";

    if (totalPages <= 1) return;

    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `
        <a class="page-link" href="#">&laquo;</a>
    `;
    prevLi.onclick = (e) => {
        e.preventDefault();
        if (currentPage > 1) loadComments(currentPage - 1);
    };
    pagination.appendChild(prevLi);

    const currentLi = document.createElement('li');
    currentLi.className = 'page-item';
    currentLi.innerHTML = `
        <span class="page-link">
            ${currentPage} / ${totalPages}
        </span>
    `;
    pagination.appendChild(currentLi);

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `
        <a class="page-link" href="#">&raquo;</a>
    `;
    nextLi.onclick = (e) => {
        e.preventDefault();
        if (currentPage < totalPages) loadComments(currentPage + 1);
    };
    pagination.appendChild(nextLi);
}



loadFilm();
loadComments()