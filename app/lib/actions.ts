'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
});


const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
    const { customerId, amount, status } = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})`;

    //With this the cache is clear and the user redirected to the invoices page
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
    // Test it out with the constant named as RawFormData:
    //console.log(typeof rawFormData.amount);
}

//Using Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData){
    const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    const amountInCents = amount * 100;

    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, 
    amount = ${amountInCents},
    status = ${status}
    WHERE id = ${id}
    `;

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}
//Delete Action Function
export async function deleteInvoice(id: string) {
    await sql
    `DELETE FROM invoices
    WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
    /*
    Since this action is being called 
    in the /dashboard/invoices path, 
    you don't need to call redirect. 
    Calling revalidatePath will trigger a 
    new server request and re-render the 
    table in the Invoices Page (/dashboard/invoices path)
    */
}
