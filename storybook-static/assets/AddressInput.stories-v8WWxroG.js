import{j as o}from"./jsx-runtime-DoEZbXM1.js";import{r as u}from"./index-CnRVFpl_.js";import{d as s}from"./styled-components.browser.esm-Dd2TsfJm.js";import"./jsx-runtime-Bw5QeaCk.js";import"./_commonjsHelpers-CqkleIqs.js";const l=s.form.attrs(()=>({className:"flex flex-col rounded-md shadow-sm"})).withConfig({componentId:"sc-7e83cde2-0"})(["gap:",";padding:",";border:1px solid ",";"],({theme:e})=>e.spacing.sm,({theme:e})=>e.spacing.base,({theme:e})=>e.colors.gray200),g=s.input.attrs(()=>({className:"rounded-md focus:outline-none focus:ring"})).withConfig({componentId:"sc-7e83cde2-1"})(["padding:0.75rem;border:1px solid ",";&:focus{box-shadow:0 0 0 2px ",";border-color:",";}"],({theme:e})=>e.colors.gray300,({theme:e})=>e.colors.primaryHover,({theme:e})=>e.colors.primaryHover),b=s.button.attrs(()=>({className:"rounded-md transition-colors"})).withConfig({componentId:"sc-7e83cde2-2"})(["padding:0.75rem 1rem;background-color:",";color:white;border:none;&:hover{background-color:",";}"],({theme:e})=>e.colors.primary,({theme:e})=>e.colors.primaryHover),m=({onSubmit:e})=>{const[n,c]=u.useState(""),p=t=>{t.preventDefault(),e(n)};return o.jsxs(l,{onSubmit:p,children:[o.jsx(g,{type:"text",placeholder:"Enter address",value:n,onChange:t=>c(t.target.value)}),o.jsx(b,{type:"submit",children:"Submit"})]})};m.__docgenInfo={description:"",methods:[],displayName:"AddressInput",props:{onSubmit:{required:!0,tsType:{name:"signature",type:"function",raw:"(address: string) => void",signature:{arguments:[{type:{name:"string"},name:"address"}],return:{name:"void"}}},description:""}}};const v={title:"Components/AddressInput",component:m,argTypes:{onSubmit:{action:"submitted"}},parameters:{docs:{description:{component:"The AddressInput component renders a form with an input field and a submit button. It manages its internal state and calls the provided onSubmit callback with the entered address when the form is submitted."}}}},r={args:{onSubmit:e=>alert(`Submitted address: ${e}`)}};var a,d,i;r.parameters={...r.parameters,docs:{...(a=r.parameters)==null?void 0:a.docs,source:{originalSource:`{
  args: {
    onSubmit: (address: string) => alert(\`Submitted address: \${address}\`)
  }
}`,...(i=(d=r.parameters)==null?void 0:d.docs)==null?void 0:i.source}}};const w=["Default"];export{r as Default,w as __namedExportsOrder,v as default};
