export const getUser = async({email, password}) => {
    const apiBase = 'http://localhost:8080/api';
    const response = await fetch(`${apiBase}/auth/login`, {
        method:"POST",
        headers:{
            "Content-Type":"application/json",
        },
        body:JSON.stringify({
            email: email,
            password: password
        })
    })
    const payload = await response.json();
    // console.log("Received user data: ", payload);
    const user = payload.data.user;
    return user;
}