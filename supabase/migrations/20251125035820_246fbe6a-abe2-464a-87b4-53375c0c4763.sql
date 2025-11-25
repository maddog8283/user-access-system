-- Allow doctors to create pending payments when completing examinations
CREATE POLICY "Doctors can create pending payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'pending' 
  AND amount = 0
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'dokter'::user_role
  )
);