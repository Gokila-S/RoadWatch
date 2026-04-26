import { pool } from './src/config/db.js';

(async () => {
   try {
        await pool.query(
          "UPDATE reports SET supporters = array_append(supporters, '11111111-1111-1111-1111-111111111111'::uuid) WHERE id = 'RW-2026-0017' AND NOT ('11111111-1111-1111-1111-111111111111'::uuid = ANY(supporters))"
        );
        console.log('Added 2nd supporter to 0017');
   } catch(e) { 
     console.error(e); 
   } finally {
     process.exit();
   }
})();
