import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { createBlogInput, updateBlogInput } from '@terry2039/medium-common1';

import { Hono } from 'hono';
import { verify } from 'hono/jwt';


export const blogRouter = new Hono<{
    Bindings: {
        DATABASE_URL : string;
        JWT_SECRET: string;
    },
    Variables: {
        userId: string,
    }
}>();

blogRouter.use("/*", async (c, next) => {
    // Get the Authorization header
    const authHeader = c.req.header("authorization") || "";
   
    // Verify the token using your JWT secret
    try {
        const user = await verify(authHeader, c.env.JWT_SECRET);
        if (user) {
            // Store the user ID in the context
            c.set("userId", user.id as string); 
            await next();
        } else {
            c.status(403);
            return c.json({
                message: "You are not logged in"
                });
            }
        } catch (e) {
        // Log the error for debugging
        console.error("Error verifying token:", e);
        c.status(403);
        return c.json({
            message: "You are not logged in"
        });
    }
});

blogRouter.post('/', async (c) => {
    const body = await c.req.json();
    const { success } = createBlogInput.safeParse(body);
    if (!success) {
        c.status(411);
        return c.json({
            message : "Inputs are not correct"
        })
    }
    const authorId = c.get("userId");
    const prisma = new PrismaClient({
        datasourceUrl: c.env?.DATABASE_URL ,
    }).$extends(withAccelerate());

    const post = await prisma.post.create({
        data : {
            title: body.title,
            content: body.content,
            authorId: Number(authorId)       
        }
    });
    return c.json({
        id: post.id
    });
})

blogRouter.put('/', async (c) => {
    const body = await c.req.json();
    const { success } = updateBlogInput.safeParse(body);
    if (!success) {
        c.status(411);
        return c.json({
            message : "Inputs are not correct"
        })
    }
    const prisma = new PrismaClient({
        datasourceUrl: c.env?.DATABASE_URL ,
    }).$extends(withAccelerate());
    const post = await prisma.post.update({
        where: {
            id: body.id
        },
        data: {
            title: body.title,
            content: body.content
        }
    });
    return c.json({
        id: post.id
    })
});

blogRouter.get('/bulk', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env?.DATABASE_URL ,
    }).$extends(withAccelerate());
    const posts = await prisma.post.findMany({
        select: {
            content: true,
            title: true,
            id: true,
            author: {
                select: {
                    name: true
                }
            }
        }
    });

    return c.json(posts);
})
    
blogRouter.get('/:id', async (c) => {
    const id = c.req.param('id');
    const prisma = new PrismaClient({
        datasourceUrl: c.env?.DATABASE_URL ,
    }).$extends(withAccelerate());

    const post = await prisma.post.findFirst({
    where: {
        id: Number(id)
    },
    select: {
        id: true,
        title: true,
        content: true,
        author: {
            select: {
                name: true
            }
        }
    }
})
    return c.json(post);
});