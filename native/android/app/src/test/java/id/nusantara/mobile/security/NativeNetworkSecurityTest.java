package id.nusantara.mobile.security;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.fail;

import java.util.Collections;
import java.util.Base64;
import okhttp3.OkHttpClient;
import org.junit.Test;

public final class NativeNetworkSecurityTest {
    private static String validPin() {
        return "sha256/" + Base64.getEncoder().encodeToString(new byte[32]);
    }

    @Test public void createsClientForExactHostnameAndValidSpkiPin() {
        OkHttpClient client = NativeNetworkSecurity.createPinnedClient(
            "api.example.com", Collections.singletonList(validPin()));
        assertNotNull(client.certificatePinner());
    }

    @Test public void rejectsEmptyPinList() {
        try {
            NativeNetworkSecurity.createPinnedClient("api.example.com", Collections.<String>emptyList());
            fail("Empty pins must be rejected.");
        } catch (IllegalArgumentException expected) { }
    }

    @Test public void rejectsMalformedPin() {
        try {
            NativeNetworkSecurity.createPinnedClient("api.example.com", Collections.singletonList("sha256/not-a-pin"));
            fail("Malformed pins must be rejected.");
        } catch (IllegalArgumentException expected) { }
    }

    @Test public void rejectsWildcardAndPortInHostname() {
        for (String host : new String[] {"*.example.com", "api.example.com:443"}) {
            try {
                NativeNetworkSecurity.createPinnedClient(host, Collections.singletonList(validPin()));
                fail("Non-exact host must be rejected: " + host);
            } catch (IllegalArgumentException expected) { }
        }
    }
}
