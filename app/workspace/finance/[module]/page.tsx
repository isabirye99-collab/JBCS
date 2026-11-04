import FinanceModule from "./FinanceModule";
export default async function FinanceModulePage({params}:{params:Promise<{module:string}>}){const {module}=await params;return <FinanceModule module={module}/>;}
