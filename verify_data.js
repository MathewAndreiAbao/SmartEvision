import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    envFile.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            env[key] = value;
        }
    });

    const supabaseUrl = env.PUBLIC_SUPABASE_URL;
    const supabaseKey = env.PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials. Found keys:', Object.keys(env));
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    async function verifyData() {
        console.log('--- Database Verification ---');
        try {
            // 1. All profiles
            const { data: allProfiles, error: pError } = await supabase.from('profiles').select('*');
            if (pError) console.error('Error profiles:', pError);
            console.log('All Profiles Count:', allProfiles?.length);
            if (allProfiles && allProfiles.length > 0) {
                const counts = allProfiles.reduce((acc, curr) => {
                    acc[curr.role] = (acc[curr.role] || 0) + 1;
                    return acc;
                }, {});
                console.log('Profile Role Distribution:', counts);
                console.log('Profile Sample (IDs/Names):', allProfiles.slice(0, 5).map(p => ({ id: p.id, name: p.full_name, role: p.role })));
            }

            // 2. Submissions Detail
            const { data: subs, error: subsError } = await supabase
                .from('submissions')
                .select('id, user_id, compliance_status, created_at');

            if (subsError) {
                console.error('Error fetching submissions:', subsError);
            } else {
                console.log('Total Submissions:', subs?.length);
                const subCounts = subs?.reduce((acc, curr) => {
                    const status = curr.compliance_status || 'missing';
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                }, {});
                console.log('Submission Status Distribution:', subCounts);
                console.log('Submission User IDs:', subs.map(s => s.user_id));
            }

            // 3. Schools
            const { count: schoolCount } = await supabase.from('schools').select('*', { count: 'exact', head: true });
            console.log('Total Schools:', schoolCount);

        } catch (err) {
            console.error('Inner script error:', err);
        }
        console.log('--- End Verification ---');
    }

    verifyData();
} catch (outerErr) {
    console.error('Outer script error:', outerErr);
}
