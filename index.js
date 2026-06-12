import private_html from 'private.html'



// ======================================= //
// ================ Users ================ //
// ======================================= //
const DBASE = [
    { 'user':'12345', 'hash':'VjxGbSHxvG5pLgYcz+yqodSkSkXRxAp7oXnrrTRYhe4=' }
]



// ====================================== //
// ================ Hash ================ //
// ====================================== //
const SALT = '__SALT__'

async function hash_generate(pass) {
    const bytes  = new TextEncoder().encode(SALT + pass)
    const buffer = await crypto.subtle.digest('SHA-256', bytes)
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}


async function hash_validate(user, pass) {
    try {
        const data = DBASE.find(row => row.user == user)
        return await hash_generate(pass) == data.hash
    } catch {
        return false
    }
}



// ======================================= //
// ================ Token ================ //
// ======================================= //
const SECRET = '__SECRET__'

const key = async () => await crypto.subtle.importKey('raw', 
    new TextEncoder().encode(SECRET), 
    { name:'HMAC', hash:'SHA-256' }, false, ['sign','verify']
)


async function token_generate(user) {
    const payload   = btoa(JSON.stringify({ user, exp: Date.now() + 1*60*60*1000 }))
    const sign      = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', await key(), new TextEncoder().encode(payload)))))
    const token     = `${payload}.${sign}`
    return token
}


async function token_validate(token) {
    try {
        const [payload, sign] = token.split('.')
        const { user, exp }   =  JSON.parse(atob(payload))
        
        const cond_1    =  await crypto.subtle.verify('HMAC', await key(), Uint8Array.from(atob(sign), c => c.charCodeAt(0)), new TextEncoder().encode(payload))
        const cond_2    =  DBASE.some(row => (row.user == user))
        const cond_3    = (Date.now() < exp)
        const cond_all  = (cond_1 && cond_2 && cond_3)

        return cond_all
    } catch { 
        return false 
    }
}




// ======================================== //
// ================ Server ================ //
// ======================================== //
export default {
    async fetch(request) {
        const url     = new URL(request.url)
        const headers = {
            'Access-Control-Allow-Origin':  '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }

        
        
        // ======================== Routes ======================== //
        if (request.method == 'OPTIONS')    return new Response(null,           { headers })
        if (url.pathname   == '/')          return new Response('Hello World',  { headers })
    

            

        // ======================== Login ======================== //
        if (url.pathname == '/login') {
            const { user, pass } = await request.json()
            if (await hash_validate(user, pass))
                    return Response.json({ status:200, token: await token_generate(user) }, { headers })
            else    return Response.json({ status:401, token: ""                         }, { headers })
        }
        

        
        // ======================== Auth ======================== //
        if (url.pathname == '/auth') {
            const token = request.headers.get('Authorization')?.replace('Bearer ', '')
            if (await token_validate(token))
                    return Response.json({ status:200, auth:true  }, { headers })
            else    return Response.json({ status:401, auth:false }, { headers })
        }
        
        
        
        // ======================== Private ======================== //
        if (url.pathname == '/private') {
            const token = request.headers.get('Authorization')?.replace('Bearer ', '')
            const { user, pass } = await request.json()

            const valid_1 = await token_validate(token)
            const valid_2 = await  hash_validate(user, pass)
            
            if (valid_1 || valid_2) 
                    return new Response(private_html, { status:200, headers: { ...headers, 'Content-Type':'text/html' }})
            else    return new Response("",           { status:401, headers: { ...headers, 'Content-Type':'text/html' }})
        }
    }
}
