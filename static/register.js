document.getElementById("form").addEventListener('submit', async function(e){
    e.preventDefault();
    let login = document.getElementById('login').value
    let password = document.getElementById('password').value
    let repeatPassword = document.getElementById("repeat-password").value
    let avatar = document.getElementById("avatar").value

    if (password == repeatPassword && password != '' && login != ''){
        let data = {
            'login': login,
            'password': password,
            'avatar': avatar
        }
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({content: data})
        });
        if(res.status === 200){
            window.location.assign('/login');
        }
    }else{
        const error = await res.json();
        alert(error.message);
    }

})
