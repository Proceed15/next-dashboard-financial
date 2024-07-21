'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.'}),
    status: z.enum(['pending', 'paid'],
    {
        invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string(),
});
//State used to perform validation before input
export type State = {
    errors?:{
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
};
//Both on the create and edit actions

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(prevState: State, formData: FormData) {
    // Validate form fields using Zod
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        };
    }
    //Use it with pnpm lint ot check if the acessibility is properly working
    //console.log(validatedFields);

    // Prepare data for insertion into the database
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];
    
    // Insert data into the database
    try {
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})`;
    } catch (error) {
        // If a database error occurs, return a more specific error.
        return {
            message: 'Failed to Create Invoice: Database Error.'
        };
    }
    //With these the cache is clear and the user redirected to the invoices page
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
    // Test it out with the constant named as RawFormData:
    //console.log(typeof rawFormData.amount);
}

//Using Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(
    id: string, 
    prevState: State,
    formData: FormData
    ) { // Validate form fields using Zod
    const validatedFields = UpdateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    }); // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Update Invoice.',
        };
    }
    //Use it with pnpm lint ot check if the acessibility is properly working
    //console.log(validatedFields);
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;

    // Update data into the database
    try {
        await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, 
        amount = ${amountInCents},
        status = ${status}
        WHERE id = ${id}
        `;
    } catch (error) {
        return {
            message: 'Failed to Update Invoice: Database Error.'
        };
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

//Delete Action Function
export async function deleteInvoice(id: string) {
    //With this the try becomes an Unreachable code block
    //throw new Error('Failed to Delete Invoice');
    try{
        await sql
        `DELETE FROM invoices
        WHERE id = ${id}`;
    } catch (error) {
        return {
            message: 'Failed to Delete Invoice: Database Error'
        };
    }
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
