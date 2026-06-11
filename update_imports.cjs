const fs = require('fs');

const files = [
    'src/pages/credit-builder/verifications/BorrowerVerificationRequests.jsx',
    'src/pages/credit-builder/verifications/VerificationCenter.jsx',
    'src/pages/capital-access/CapitalAccessList.tsx',
    'src/pages/credit-builder/credit-accounts/CreditAccountsList.jsx',
];

files.forEach(file => {
    if(fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/from '\.\.\/\.\.\//g, "from '../../../");
        fs.writeFileSync(file, content);
    }
});

const components = [
    'src/pages/credit-builder/verifications/components/BorrowerProfileModal.jsx',
    'src/pages/credit-builder/verifications/components/NoteViewModal.jsx',
    'src/pages/credit-builder/verifications/components/ResponseDetailModal.jsx',
    'src/pages/credit-builder/verifications/components/VerificationActionModal.jsx',
    'src/pages/capital-access/components/CapitalAccessForm.tsx',
    'src/pages/credit-builder/credit-accounts/components/CreditAccountForm.jsx',
];

components.forEach(file => {
    if(fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/from '\.\.\/\.\.\/\.\.\//g, "from '../../../../");
        fs.writeFileSync(file, content);
    }
});
