<template>
  <div>
    <div><strong>For FLC Use:</strong></div>
    <div class="section">Validity Period: <span class="underline"></span></div>

    <h2>RAS VPN Account Request Form</h2>

    <p>
      Please fill out the following form completely. Incomplete forms will not
      be processed.
    </p>

    <table>
      <tr>
        <td class="label">Check Category:</td>
        <!--<td><div class="checkbox checked"></div> Employee</td>
      <td><div class="checkbox "></div> 3rd Party Contractor</td>-->
        <td>
          <div class="checkbox checked"></div>
          {{ VAR1 }} New
        </td>
        
      </tr>
      <tr>
        <td class="label">Request Type:</td>
        <!--<td><div class="checkbox {{VAR3}}"></div> New</td>
      <td><div class="checkbox {{VAR4}}"></div> Renewal</td>-->
        <td>
          <div class="checkbox checked"></div>
          {{ VAR3 }} Employee
        </td>
      </tr>
    </table>

    <h3>User Information</h3>

    <table>
      <tr>
        <td class="label">Full Name:</td>
        <td>
          <span class="underline">{{ VAR5 }} AUSTINE JUDE MENDOZA</span>
        </td>
      </tr>
      <tr>
        <td class="label">Designation:</td>
        <td>
          <span class="underline">{{ VAR6 }} IT PROGRAMMER</span>
        </td>
      </tr>
      <tr>
        <td class="label">Email Address:</td>
        <td>
          <span class="underline">{{ VAR7 }}AJDMENDOZA@FASTGROUP.BIZ</span>
        </td>
      </tr>
      <tr>
        <td class="label">Mobile No:</td>
        <td>
          <span class="underline">{{ VAR8 }} 09080898797</span>
        </td>
      </tr>
      <tr>
        <td class="label" style="vertical-align: top">
          VPN Request Justification:
        </td>
        <td>
          <div style="border: 1px solid black; height: 80px">{{ Var9 }} SAMPLE REQUEST</div>
        </td>
      </tr>
    </table>

    <h3>Immediate Head Information (Manager)</h3>

    <table>
      <tr>
        <td class="label">Name:</td>
        <td>
          <span class="underline">{{ VAR10 }} RICHARD PEREZ</span>
        </td>
      </tr>
      <tr>
        <td class="label">Designation:</td>
        <td>
          <span class="underline">{{ VAR11 }} IT PROGRAMMER</span>
        </td>
      </tr>
      <tr>
        <td class="label">Email Add:</td>
        <td>
          <span class="underline">{{ VAR12 }}RLPEREZ@FASTGROUP.BIZ</span>
        </td>
      </tr>
      <tr>
        <td class="label">Mobile:</td>
        <td>
          <span class="underline">{{ VAR13 }} 09545454456</span>
        </td>
      </tr>
    </table>
    <div class="page-break">
      <h3>RAS VPN User Agreement</h3>

      <p>I hereby declare that:</p>
      <ol>
        <li>The information provided above is correct.</li>
        <li>
          The password provided will be kept safe and will not be shared with
          others.
        </li>
        <li>
          Will not be part of any activity and will not disclose any information
          about FASTGROUP Group Network (FASTNET) VPN service that may result in
          breach of FASTNET facilities.
        </li>
        <li>
          Will not use my VPN account to gain unauthorized access to other
          FASTNET facilities.
        </li>
        <li>
          I am responsible for the safety of my VPN credentials (login, password
          and digital certificate) and computer used for accessing FASTNET VPN.
          If my password or my computer has been compromised, I will inform the
          VPN administrator immediately.
        </li>
        <li>
          I agree to be bound by the Company policies and regulations including,
          but not limited to, its FAST INFORMATION POLICY.
        </li>
        <li>
          I agree that this will be subject for review and final approval of SBU
          IT Manager.
        </li>
      </ol>
      I understand my responsibility to respect and maintain confidentiality of
      all information which I have access through my computer. I understand that
      my non-compliance with the terms and conditions of FLC RAS VPN service may
      result in the deletion of my VPN account.
    </div>
    <div class="section">
      <table style="width: 100%">
        <tr>
          <td style="width: 70%">
            <span class="underline">{{ VAR14 }} AUSTINE JUDE MENDOZA</span
            ><br />
            Signature over Printed Name
          </td>
          <td style="width: 30%">
            <span class="underline">{{ CREATEDDATE }} JUNE 11,2025</span
            ><br />
            Date
          </td>
        </tr>
      </table>
    </div>

    <div class="section">
      <strong>Superior Acknowledgment</strong>
      <p>
        I acknowledge that the requesting user requires the type of access
        indicated in this form. I understand that providing remote access to
        remote users and devices exposes FASTNET to certain security risks. As
        the immediate Superior, I accept responsibility for monitoring the
        requesting user's compliance with the Company policies and regulations
        including, but not limited to, its FAST INFORMATION POLICY.
      </p>
      <table style="width: 100%">
        <tr>
          <td style="width: 70%">
            <span class="underline">{{ APPROVER1_NAME }} RICHARD PEREZ</span
            ><br />
            Signature over Printed Name
          </td>
          <td style="width: 30%">
            <span class="underline">{{ APPROVER1_DATE }} JUNE 11, 2025</span
            ><br />
            Date
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script setup></script>

<style>
body {
  font-family: Arial, sans-serif;
  font-size: 14px;
}
h2,
h3 {
  text-align: center;
  margin: 10px 0;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
}
td,
th {
  padding: 5px;
  vertical-align: top;
}
.label {
  width: 150px;
  font-weight: bold;
}
.underline {
  border-bottom: 1px solid black;
  display: inline-block;
  width: 100%;
  height: 20px;
}
.signature-line {
  margin-top: 40px;
}
.checkbox {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 1px solid black;
  margin-right: 5px;
  text-align: center;
  vertical-align: middle;
  line-height: 14px;
  font-size: 12px;
  font-family: Arial, sans-serif;
}

.checked::before {
  content: "✔";
}
.section {
  margin-top: 30px;
}
.page-break {
  page-break-before: always;
}
</style>
