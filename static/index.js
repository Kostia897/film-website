const socket = io({
    auth: {
        cookie: document.cookie
    }
});


async function loadFilms(){
    const res = await fetch(`/api/getfilms`);
    const data = await res.json();

    let filmsList = document.getElementById('filmsList');
    let loginOrLeave = document.getElementById('loginOrLeave');

    if(data.userId !== null){
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
    

    data.films.forEach(film => {
        let div = document.createElement('div')
        div.classList.add('film')
        div.innerHTML += `<img class="poster" src="${film.poster}" /> 
                          <p>${film.title}</p>`
        div.addEventListener('click', () => {
            window.location.assign(`/film?filmId=${film.film_id}`);
        });
        filmsList.appendChild(div)
    })
}


loadFilms()