-- Allow clinic owner to view all patient data
CREATE POLICY "Clinic owner can view all patients"
ON public.patients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'pemilik_klinik'::user_role
  )
);

-- Allow clinic owner to view all examinations
CREATE POLICY "Clinic owner can view all examinations"
ON public.examinations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'pemilik_klinik'::user_role
  )
);