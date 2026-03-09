import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if admin already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some(u => u.email === "admin@super.com");

    if (adminExists) {
      return new Response(JSON.stringify({ message: "Admin already exists" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin user
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email: "admin@super.com",
      password: "Admin@456?!#",
      email_confirm: true,
      user_metadata: { display_name: "Super Admin" },
    });

    if (error) throw error;

    // Set role to super_admin
    await supabaseAdmin.from("user_roles").update({ role: "super_admin" }).eq("user_id", newUser.user.id);

    // Verify profile
    await supabaseAdmin.from("profiles").update({ is_verified: true, onboarding_completed: true }).eq("user_id", newUser.user.id);

    // Add admin to suggested_follows so all new users must follow
    await supabaseAdmin.from("suggested_follows").insert({ user_id: newUser.user.id, display_order: 0, is_mandatory: true });

    return new Response(JSON.stringify({ message: "Admin created successfully", userId: newUser.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
