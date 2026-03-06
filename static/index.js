const socket = io({
    auth: {
        cookie: document.cookie
    }
});

let currentPage = 1;
let totalPages = 1;
const filmsPerPage = 12;

async function loadFilms(page = 1){
    currentPage = page;

    const offset = (page - 1) * filmsPerPage;
    
    const res = await fetch(`/api/getfilms?offset=${offset}&limit=${filmsPerPage}`);
    const data = await res.json();

    if (data.role === "admin") {
        document.getElementById("addFilmBtn").style.display = "block";
    }

    let filmsList = document.getElementById('filmsList');
    let loginOrLeave = document.getElementById('loginOrLeave');

    filmsList.innerHTML = "";

    if(data.userId !== null){
        loginOrLeave.classList.add('btn-outline-danger')
        loginOrLeave.classList.remove('btn-outline-light')
        loginOrLeave.textContent = 'Log out'
        loginOrLeave.addEventListener('click', function(e){
            e.preventDefault();
            document.cookie = 'token=; Max-Age=0';
            window.location.assign(`/login`);
        })
    }
    
    const films = data.films;

    totalPages = Math.ceil(data.totalCount / filmsPerPage);

    films.forEach(film => {
        let div = document.createElement('div')
        div.classList.add('film')

        div.innerHTML += `
            <img class="poster" src="${film.poster}" /> 
            <p>${film.title}</p>
        `

        div.addEventListener('click', () => {
            window.location.assign(`/film?filmId=${film.film_id}`);
        });

        filmsList.appendChild(div)
    })

    renderPagination()
}


loadFilms()



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
        if (currentPage > 1) loadFilms(currentPage - 1);
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
        if (currentPage < totalPages) loadFilms(currentPage + 1);
    };
    pagination.appendChild(nextLi);
}




const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');

searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();

    if(query == "") {
        loadFilms()
        return;
    }

    const res = await fetch(`/api/getfilms?search=${query}&limit=${filmsPerPage}&offset=0`);
    const data = await res.json();

    filmsList.innerHTML = "";

    if(data.films.length == 0){
        filmsList.innerHTML = "<p class='text-center'>No films found</p>";
        pagination.innerHTML = "";
        return;
    }

    data.films.forEach(film => {
        const div = document.createElement('div');
        div.classList.add('film');

        div.innerHTML = `
            <img class="poster" src="${film.poster}" /> 
            <p>${film.title}</p>
        `;

        div.addEventListener('click', () => {
            window.location.assign(`/film?filmId=${film.film_id}`);
        });

        filmsList.appendChild(div);
    });

    pagination.innerHTML = "";
});