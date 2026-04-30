import os
import re

models_dir = r"d:\crmsistemaxi\sistemaxi-crm\backend\app\models"

models_to_modify = [
    "usuario.py", "cliente.py", "lead.py", "projeto.py", "tarefa.py", 
    "proposta.py", "contrato.py", "pipeline.py", "agent.py", "whatsapp.py", 
    "campaign.py", "financeiro.py"
]

import_statement = "from sqlalchemy.dialects.postgresql import UUID\n"
tenant_col = "    tenant_id = Column(UUID(as_uuid=True), ForeignKey(\"tenants.id\", ondelete=\"CASCADE\"), nullable=True, index=True)\n"
tenant_rel = "    tenant = relationship(\"Tenant\")\n"

for filename in models_to_modify:
    filepath = os.path.join(models_dir, filename)
    if not os.path.exists(filepath):
        print(f"Skipping {filename}")
        continue
        
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    if "tenant_id" in content:
        print(f"Already modified {filename}")
        continue

    # Add import ForeignKey if not exists
    if "ForeignKey" not in content:
        content = content.replace("from sqlalchemy import Column", "from sqlalchemy import Column, ForeignKey")
        
    # Add import UUID if not exists
    if "from sqlalchemy.dialects.postgresql import UUID" not in content and "UUID" not in content:
        # Find first sqlalchemy import
        content = re.sub(r'(from sqlalchemy .*?\n)', r'\1' + import_statement, content, count=1)
        
    # Add to specific classes. A simple heuristic is to find "id = Column(UUID" and add it after.
    # We will add it to the FIRST class in each file that has __tablename__.
    
    # We can match `    __tablename__ = "..."` and insert `tenant_id` after it.
    # Actually, some files have multiple models.
    # So let's insert it after EVERY `__tablename__ = "..."`
    
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        new_lines.append(line)
        if line.strip().startswith('__tablename__ ='):
            # Add tenant_id
            new_lines.append(tenant_col.rstrip())
            new_lines.append(tenant_rel.rstrip())
            
    # Write back
    with open(filepath, "w", encoding="utf-8") as f:
        f.write('\n'.join(new_lines))
        
    print(f"Modified {filename}")
