-- STATEMENT
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- STATEMENT
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'employee', 'client')),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- STATEMENT
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unique_project_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    client_email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- STATEMENT
CREATE TABLE IF NOT EXISTS project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(project_id, employee_id)
);

-- STATEMENT
CREATE TABLE IF NOT EXISTS feature_flags (
    project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    apex_joule_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- STATEMENT
CREATE TABLE IF NOT EXISTS help_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- STATEMENT
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- STATEMENT
CREATE TABLE IF NOT EXISTS transactional_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- STATEMENT
CREATE OR REPLACE FUNCTION check_employee_project_limit()
RETURNS TRIGGER AS $$
DECLARE
    active_project_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO active_project_count
    FROM project_assignments pa
    JOIN projects p ON pa.project_id = p.id
    WHERE pa.employee_id = NEW.employee_id
      AND p.status = 'active';

    IF active_project_count >= 3 THEN
        RAISE EXCEPTION 'Employee is already assigned to the maximum limit of 3 active projects.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STATEMENT
CREATE OR REPLACE TRIGGER enforce_employee_project_limit
BEFORE INSERT ON project_assignments
FOR EACH ROW
EXECUTE FUNCTION check_employee_project_limit();

-- STATEMENT
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- STATEMENT
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- STATEMENT
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- STATEMENT
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

-- STATEMENT
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- STATEMENT
ALTER TABLE help_tickets ENABLE ROW LEVEL SECURITY;

-- STATEMENT
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- STATEMENT
ALTER TABLE transactional_emails ENABLE ROW LEVEL SECURITY;

-- STATEMENT
CREATE OR REPLACE FUNCTION public.sync_profile_to_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = 
        COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object('role', NEW.role, 'company_id', NEW.company_id)
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, public;

-- STATEMENT
DROP TRIGGER IF EXISTS on_profile_change ON public.profiles;
CREATE TRIGGER on_profile_change
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_to_user_metadata();

-- STATEMENT
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
DECLARE
    c_id UUID;
BEGIN
    c_id := ((auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid);
    IF c_id IS NULL THEN
        SELECT company_id INTO c_id FROM public.profiles WHERE id = auth.uid();
    END IF;
    RETURN c_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- STATEMENT
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    u_role TEXT;
BEGIN
    u_role := (auth.jwt() -> 'user_metadata' ->> 'role');
    IF u_role IS NULL THEN
        SELECT role INTO u_role FROM public.profiles WHERE id = auth.uid();
    END IF;
    RETURN u_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- STATEMENT
CREATE OR REPLACE FUNCTION get_user_email()
RETURNS TEXT AS $$
DECLARE
    u_email TEXT;
BEGIN
    u_email := (auth.jwt() ->> 'email');
    IF u_email IS NULL THEN
        SELECT email INTO u_email FROM public.profiles WHERE id = auth.uid();
    END IF;
    RETURN u_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- STATEMENT
DROP POLICY IF EXISTS select_company ON companies;
CREATE POLICY select_company ON companies
    FOR SELECT USING (id = get_user_company_id());

-- STATEMENT
DROP POLICY IF EXISTS insert_company ON companies;
CREATE POLICY insert_company ON companies
    FOR INSERT WITH CHECK (true);

-- STATEMENT
DROP POLICY IF EXISTS update_company ON companies;
CREATE POLICY update_company ON companies
    FOR UPDATE USING (id = get_user_company_id() AND get_user_role() = 'admin');

-- STATEMENT
DROP POLICY IF EXISTS select_profile ON profiles;
CREATE POLICY select_profile ON profiles
    FOR SELECT USING (
        id = auth.uid() OR 
        company_id = ((auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid)
    );

-- STATEMENT
DROP POLICY IF EXISTS insert_profile ON profiles;
CREATE POLICY insert_profile ON profiles
    FOR INSERT WITH CHECK (true);

-- STATEMENT
DROP POLICY IF EXISTS update_profile ON profiles;
CREATE POLICY update_profile ON profiles
    FOR UPDATE USING (
        id = auth.uid() OR 
        (company_id = ((auth.jwt() -> 'user_metadata' ->> 'company_id')::uuid) AND 
         (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    );

-- STATEMENT
DROP POLICY IF EXISTS select_projects ON projects;
CREATE POLICY select_projects ON projects
    FOR SELECT USING (
        (company_id = get_user_company_id() AND get_user_role() = 'admin') OR
        id IN (SELECT project_id FROM project_assignments WHERE employee_id = auth.uid()) OR
        client_email = get_user_email()
    );

-- STATEMENT
DROP POLICY IF EXISTS insert_projects ON projects;
CREATE POLICY insert_projects ON projects
    FOR INSERT WITH CHECK (company_id = get_user_company_id() AND get_user_role() = 'admin');

-- STATEMENT
DROP POLICY IF EXISTS update_projects ON projects;
CREATE POLICY update_projects ON projects
    FOR UPDATE USING (company_id = get_user_company_id() AND get_user_role() = 'admin');

-- STATEMENT
DROP POLICY IF EXISTS select_assignments ON project_assignments;
CREATE POLICY select_assignments ON project_assignments
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects WHERE 
                (company_id = get_user_company_id() AND get_user_role() = 'admin') OR
                id IN (SELECT project_id FROM project_assignments WHERE employee_id = auth.uid()) OR
                client_email = get_user_email()
        )
    );

-- STATEMENT
DROP POLICY IF EXISTS insert_assignments ON project_assignments;
CREATE POLICY insert_assignments ON project_assignments
    FOR INSERT WITH CHECK (
        project_id IN (SELECT id FROM projects WHERE company_id = get_user_company_id() AND get_user_role() = 'admin')
    );

-- STATEMENT
DROP POLICY IF EXISTS delete_assignments ON project_assignments;
CREATE POLICY delete_assignments ON project_assignments
    FOR DELETE USING (
        project_id IN (SELECT id FROM projects WHERE company_id = get_user_company_id() AND get_user_role() = 'admin')
    );

-- STATEMENT
DROP POLICY IF EXISTS select_feature_flags ON feature_flags;
CREATE POLICY select_feature_flags ON feature_flags
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects WHERE 
                (company_id = get_user_company_id() AND get_user_role() = 'admin') OR
                id IN (SELECT project_id FROM project_assignments WHERE employee_id = auth.uid()) OR
                client_email = get_user_email()
        )
    );

-- STATEMENT
DROP POLICY IF EXISTS write_feature_flags ON feature_flags;
CREATE POLICY write_feature_flags ON feature_flags
    FOR ALL USING (
        project_id IN (SELECT id FROM projects WHERE company_id = get_user_company_id() AND get_user_role() = 'admin')
    );

-- STATEMENT
DROP POLICY IF EXISTS select_tickets ON help_tickets;
CREATE POLICY select_tickets ON help_tickets
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects WHERE 
                (company_id = get_user_company_id() AND get_user_role() = 'admin') OR
                id IN (SELECT project_id FROM project_assignments WHERE employee_id = auth.uid()) OR
                client_email = get_user_email()
        )
    );

-- STATEMENT
DROP POLICY IF EXISTS insert_tickets ON help_tickets;
CREATE POLICY insert_tickets ON help_tickets
    FOR INSERT WITH CHECK (
        client_id = auth.uid() OR
        project_id IN (SELECT id FROM projects WHERE company_id = get_user_company_id() AND get_user_role() = 'admin')
    );

-- STATEMENT
DROP POLICY IF EXISTS update_tickets ON help_tickets;
CREATE POLICY update_tickets ON help_tickets
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM projects WHERE 
                (company_id = get_user_company_id() AND get_user_role() = 'admin') OR
                id IN (SELECT project_id FROM project_assignments WHERE employee_id = auth.uid())
        )
    );

-- STATEMENT
DROP POLICY IF EXISTS manage_notifications ON notifications;
CREATE POLICY manage_notifications ON notifications
    FOR ALL USING (
        user_id = auth.uid()
    );

-- STATEMENT
DROP POLICY IF EXISTS select_emails ON transactional_emails;
CREATE POLICY select_emails ON transactional_emails
    FOR SELECT USING (get_user_role() = 'admin');
