export const getUserRole = async({email, password}) => {
    const apiBase= process.env.VITE_API_URL || 'http://localhost:8080';
    const response = await fetch(`${apiBase}/auth/login`,{
        method:"POST",
        headers:{
            'Content-Type':'application/json',
            
        },
        body:JSON.stringify({
            email: email,
            password:password
        })
    })
    const payload = await response.json();
    const role = payload?.data?.user?.role
    return role;
}